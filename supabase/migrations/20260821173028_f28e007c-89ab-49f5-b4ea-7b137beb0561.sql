-- 1. has_role must stay callable by signed-in users (RLS policies depend on it),
-- but it must not answer questions about other people's roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only privileged server-side roles may ask about an arbitrary user.
  IF _user_id IS DISTINCT FROM auth.uid()
     AND current_user NOT IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 2. Tighten deletion-request removal to pending rows only.
DROP POLICY IF EXISTS "Users can delete their own pending deletion request" ON public.account_deletion_requests;

CREATE POLICY "Users can delete their own pending deletion request"
  ON public.account_deletion_requests
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
    AND executed_at IS NULL
    AND cancelled_at IS NULL
  );