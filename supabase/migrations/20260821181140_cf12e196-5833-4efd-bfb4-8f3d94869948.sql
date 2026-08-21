-- Revert the webhook smoke-test side effects on the test account and drop the test events.
update public.profiles
   set plan = 'free', billing_period = null, trial_ends_at = null
 where id = 'e6570fc5-bbe4-458e-bc75-7800ca10c8a2';

delete from public.stripe_events
 where event_id in ('evt_A','evt_B','evt_C','evt_D','evt_E','evt_F','evt_G','evt_H');