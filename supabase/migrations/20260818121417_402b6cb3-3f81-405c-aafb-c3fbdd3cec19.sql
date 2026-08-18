-- Retarget the daily account-deletion job at the hostname that actually serves
-- this app. The id-derived host (project--<id>.lovable.app) returns 403 for /
-- and never served a verified 200 for this project, so scheduling against it
-- would leave the job silently dead.
--
-- TRADEOFF, stated deliberately: luxury-whisper-desk.lovable.app derives from
-- the PROJECT NAME. Renaming the project breaks this job, and the breakage is
-- silent (nightly non-2xx, no row in account_deletion_runs). That is a real
-- weakness, accepted because a name-derived URL that works beats an
-- id-derived one that does not. If the project is ever renamed, this schedule
-- must be updated in the same change.
select cron.unschedule('run-account-deletions-daily')
where exists (select 1 from cron.job where jobname = 'run-account-deletions-daily');

select cron.schedule(
  'run-account-deletions-daily',
  '15 3 * * *',
  $job$
  select net.http_post(
    url := 'https://luxury-whisper-desk.lovable.app/api/public/run-account-deletions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-account-deletion-secret',
      coalesce((select value from private.cron_secrets where name = 'ACCOUNT_DELETION_CRON_SECRET'), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $job$
);