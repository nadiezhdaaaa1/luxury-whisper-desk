-- ============================================================
-- Observability only. The deletion/erasure path is NOT touched.
-- ============================================================

-- 1. Dispatch log ------------------------------------------------------------
create table if not exists public.account_deletion_dispatches (
  request_id bigint primary key,
  queued_at timestamptz not null default now(),
  status_code integer,
  error_msg text,
  reconciled_at timestamptz
);

grant select on public.account_deletion_dispatches to authenticated;
grant all on public.account_deletion_dispatches to service_role;

alter table public.account_deletion_dispatches enable row level security;

drop policy if exists "Admins can read deletion dispatches" on public.account_deletion_dispatches;
create policy "Admins can read deletion dispatches"
  on public.account_deletion_dispatches
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- 2. Main job: keep the request id instead of discarding it -------------------
-- Same command as before, wrapped so net.http_post's returned request id is
-- persisted. The URL, headers and secret lookup are unchanged.
select cron.unschedule('run-account-deletions-daily')
where exists (select 1 from cron.job where jobname = 'run-account-deletions-daily');

select cron.schedule(
  'run-account-deletions-daily',
  '15 3 * * *',
  $job$
  insert into public.account_deletion_dispatches (request_id)
  select net.http_post(
    url := 'https://luxury-whisper-desk.lovable.app/api/public/run-account-deletions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-account-deletion-secret',
      coalesce((select value from private.cron_secrets where name = 'ACCOUNT_DELETION_CRON_SECRET'), '')
    ),
    body := '{}'::jsonb
  );
  $job$
);

-- 3. Reconciler ---------------------------------------------------------------
-- WHY THIS CANNOT RUN ONCE A DAY: pg_net prunes net._http_response after about
-- six hours. A daily reconciler running in arrears would find the response row
-- already gone and could not tell "request failed" from "request succeeded but
-- the evidence expired". It therefore runs 10 minutes behind the dispatch.
--
-- Three outcomes are kept distinct in the data:
--   * response row present            -> status_code (and error_msg if any) written
--   * still queued in pg_net          -> left unreconciled, retried next run
--   * no response row, >5 min elapsed -> status_code NULL, error_msg 'no_response_row'
--     i.e. the request never completed, which is NOT the same as a non-2xx.
create or replace function public.reconcile_account_deletion_dispatches()
returns void
language plpgsql
security definer
set search_path = public, net
as $$
begin
  update public.account_deletion_dispatches d
     set status_code = r.status_code,
         error_msg = r.error_msg,
         reconciled_at = now()
    from net._http_response r
   where r.id = d.request_id
     and d.reconciled_at is null;

  update public.account_deletion_dispatches d
     set status_code = null,
         error_msg = 'no_response_row',
         reconciled_at = now()
   where d.reconciled_at is null
     and d.queued_at < now() - interval '5 minutes'
     and not exists (select 1 from net.http_request_queue q where q.id = d.request_id);
end;
$$;

revoke all on function public.reconcile_account_deletion_dispatches() from public;

select cron.unschedule('reconcile-account-deletion-dispatches')
where exists (select 1 from cron.job where jobname = 'reconcile-account-deletion-dispatches');

select cron.schedule(
  'reconcile-account-deletion-dispatches',
  '25 3 * * *',
  $job$ select public.reconcile_account_deletion_dispatches(); $job$
);

-- 4. Health view --------------------------------------------------------------
drop view if exists public.account_deletion_health;
create view public.account_deletion_health
with (security_invoker = on)
as
with disp as (
  select
    max(queued_at) as last_dispatch_at,
    max(queued_at) filter (
      where reconciled_at is not null
        and (status_code is null or status_code < 200 or status_code >= 300)
    ) as last_failed_dispatch_at,
    max(queued_at) filter (where status_code between 200 and 299) as last_ok_dispatch_at
  from public.account_deletion_dispatches
),
runs as (
  select max(ran_at) as last_run_at from public.account_deletion_runs
)
select
  runs.last_run_at as last_successful_handler_run_at,
  disp.last_dispatch_at,
  disp.last_failed_dispatch_at as last_non_2xx_at,
  round(extract(epoch from (now() - runs.last_run_at)) / 3600.0, 2) as hours_since_handler_run,
  round(extract(epoch from (now() - disp.last_dispatch_at)) / 3600.0, 2) as hours_since_dispatch,
  round(extract(epoch from (now() - disp.last_failed_dispatch_at)) / 3600.0, 2) as hours_since_non_2xx,
  case
    when disp.last_dispatch_at is null then 'cron_never_fired'
    when runs.last_run_at is null then 'request_never_reached_handler'
    when runs.last_run_at >= disp.last_dispatch_at - interval '15 minutes' then 'healthy'
    else 'dispatch_without_handler_run'
  end as state
from disp, runs;

grant select on public.account_deletion_health to authenticated;
grant all on public.account_deletion_health to service_role;