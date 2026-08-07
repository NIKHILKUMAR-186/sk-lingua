-- ============================================================
-- Fix missing GRANT privileges for subscription_plans table
-- ============================================================
-- The table has RLS policies for admin management but lacks
-- table-level UPDATE/INSERT/DELETE grants to the authenticated role.
-- PostgreSQL requires both table-level grants AND RLS policies.

-- Grant full CRUD to authenticated role (RLS will restrict to admins only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

-- ============================================================
-- Verification queries (run these to confirm the fix)
-- ============================================================
-- Check granted privileges:
-- SELECT grantee, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_name = 'subscription_plans' 
-- AND grantee = 'authenticated';

-- Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'subscription_plans';

-- Test UPDATE as admin (should succeed):
-- UPDATE public.subscription_plans 
-- SET name = 'Test Plan', updated_at = now() 
-- WHERE id = 'some-plan-id'
-- AND public.has_role(auth.uid(), 'admin');

-- Test UPDATE as non-admin (should fail with RLS):
-- UPDATE public.subscription_plans 
-- SET name = 'Test Plan' 
-- WHERE id = 'some-plan-id';
-- ============================================================