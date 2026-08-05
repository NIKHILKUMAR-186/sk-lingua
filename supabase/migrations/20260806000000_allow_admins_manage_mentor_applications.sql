-- Allow authenticated users with app_role 'admin' to manage mentor_applications
-- This migration drops the service_role-only admin policy and replaces it
-- with a policy that grants authenticated admin users management rights.

-- Remove the old policy (if present)
DROP POLICY IF EXISTS "Mentor applications admin manage" ON public.mentor_applications;

-- Create a new policy that allows authenticated users who have the 'admin' role
-- (via public.has_role) to SELECT/INSERT/UPDATE/DELETE their management actions.
CREATE POLICY "Mentor applications admin manage" ON public.mentor_applications
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure service_role still has full privileges (GRANTs already exist, keep for clarity)
GRANT ALL ON public.mentor_applications TO service_role;
