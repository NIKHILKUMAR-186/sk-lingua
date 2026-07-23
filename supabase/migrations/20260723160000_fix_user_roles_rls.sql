-- Fix user_roles permissions and row-level security for authenticated users.

GRANT SELECT, INSERT, UPDATE ON public.user_roles TO authenticated;

CREATE POLICY IF NOT EXISTS "Users update own roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
