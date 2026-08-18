create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.cron_secrets (
  name  text primary key,
  value text not null
);

revoke all on private.cron_secrets from anon, authenticated;
grant all on private.cron_secrets to service_role;
alter table private.cron_secrets enable row level security;

select cron.unschedule('run-account-deletions-daily')
where exists (select 1 from cron.job where jobname = 'run-account-deletions-daily');

select cron.schedule(
  'run-account-deletions-daily',
  '15 3 * * *',
  $job$
  select net.http_post(
    url := 'https://project--7107de7c-afc2-44e8-8a3d-e271f2c26295.lovable.app/api/public/run-account-deletions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-account-deletion-secret',
      coalesce((select value from private.cron_secrets where name = 'ACCOUNT_DELETION_CRON_SECRET'), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $job$
);