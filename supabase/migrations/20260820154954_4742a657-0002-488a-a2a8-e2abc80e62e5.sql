-- 1) Harden has_role: callers may only check their own roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Let owners delete their own non-executed deletion request; keep the
-- executed audit trail immutable.
CREATE POLICY "Users can delete their own pending deletion request"
  ON public.account_deletion_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND executed_at IS NULL AND status <> 'executed');

GRANT DELETE ON public.account_deletion_requests TO authenticated;