CREATE TABLE IF NOT EXISTS public._audit_probe (id serial primary key, step text, outcome text);
TRUNCATE public._audit_probe;
REVOKE ALL ON public._audit_probe FROM anon, authenticated;

DO $probe$
DECLARE
  v_uid text := 'aab2de09-b6da-4c41-80dc-7349e8ddd4d1';
  v_claims text;
  r record;
  v_out text;
  v_admin boolean;
  probes text[][] := ARRAY[
    ['A1  call has_role() as non-admin',        'select public.has_role(auth.uid(), ''admin''::public.app_role)'],
    ['A1  read account_deletion_health',        'select count(*) from public.account_deletion_health'],
    ['A1  read account_deletion_runs',          'select count(*) from public.account_deletion_runs'],
    ['A4  UPDATE own profiles.email',           'update public.profiles set email = email where id = auth.uid()'],
    ['A4  UPDATE own profiles.plan',            'update public.profiles set plan = plan where id = auth.uid()'],
    ['A4  UPDATE own profiles.display_name',    'update public.profiles set display_name = display_name where id = auth.uid()'],
    ['A4  UPDATE own quiz_completed',           'update public.profiles set quiz_completed = quiz_completed where id = auth.uid()'],
    ['A4  UPDATE own onboarding_completed',     'update public.profiles set onboarding_completed = onboarding_completed where id = auth.uid()'],
    ['A4  UPDATE own brands/segments',          'update public.profiles set brands = brands, segments = segments where id = auth.uid()'],
    ['A4  UPDATE someone else email',           'update public.profiles set email = email where id <> auth.uid()'],
    ['A2  INSERT into signals',                 'insert into public.signals(id,type,category,brand_slug,brand_name,title,body,signal_date) values (''probe'',''t'',''watches'',''rolex'',''Rolex'',''t'',''b'',now())'],
    ['A2  self-grant admin in user_roles',      'insert into public.user_roles(user_id, role) values (auth.uid(), ''admin'')'],
    ['A2  UPDATE brands catalog',               'update public.brands set name = name where slug = ''rolex'''],
    ['A2  DELETE own deletion request',         'delete from public.account_deletion_requests where user_id = auth.uid()'],
    ['A3  SELECT portfolio_removals',           'select count(*) from public.portfolio_removals'],
    ['A3  INSERT own portfolio_removal',        'insert into public.portfolio_removals(user_id, reason) values (auth.uid(), ''probe'')'],
    ['ok  SELECT own profile',                  'select count(*) from public.profiles where id = auth.uid()'],
    ['ok  INSERT own watchlist row',            'insert into public.watchlist(user_id,type,category,brand) values (auth.uid(),''brand'',''watches'',''Probe Brand'')'],
    ['ok  DELETE own watchlist row',            'delete from public.watchlist where user_id = auth.uid() and brand = ''Probe Brand'''],
    ['ok  DELETE own portfolio item (cap exit)','delete from public.portfolio_items where user_id = auth.uid() and brand = ''__nonexistent__''']
  ];
  i int;
BEGIN
  v_claims := json_build_object('sub', v_uid, 'role', 'authenticated', 'email', 'probe@example.com')::text;

  FOR i IN 1 .. array_length(probes, 1) LOOP
    BEGIN
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', v_claims, true);
      EXECUTE probes[i][2];
      v_out := 'ALLOWED';
    EXCEPTION WHEN others THEN
      v_out := 'BLOCKED ' || SQLSTATE || ': ' || left(SQLERRM, 110);
    END;
    PERFORM set_config('role', 'postgres', true);
    INSERT INTO public._audit_probe(step, outcome) VALUES (probes[i][1], v_out);
  END LOOP;

  -- Temporary admin row so the admin read path can be proven, removed below.
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid::uuid, 'admin');
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', v_claims, true);
    SELECT public.has_role(auth.uid(), 'admin') INTO v_admin;
    EXECUTE 'select count(*) from public.account_deletion_health';
    v_out := 'ALLOWED (has_role=' || v_admin || ')';
  EXCEPTION WHEN others THEN
    v_out := 'BLOCKED ' || SQLSTATE || ': ' || left(SQLERRM, 110);
  END;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO public._audit_probe(step, outcome) VALUES ('A1  read health AS TEMP ADMIN', v_out);
  DELETE FROM public.user_roles WHERE user_id = v_uid::uuid AND role = 'admin';

  -- Undo anything a probe was allowed to write.
  DELETE FROM public.signals WHERE id = 'probe';
  DELETE FROM public.portfolio_removals WHERE reason = 'probe';
  DELETE FROM public.watchlist WHERE brand = 'Probe Brand';
  DELETE FROM public.user_roles WHERE user_id = v_uid::uuid AND role = 'admin';
END
$probe$;