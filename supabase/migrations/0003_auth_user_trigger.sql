-- Auto-provision public.users row when a new auth.users row is created.
-- Without this, signup succeeds in Supabase Auth but any foreign-key
-- write against public.users (e.g. student_profiles, applications) fails.

-- ============================================================
-- Loosen NOT NULL on columns filled in during onboarding, not signup
-- ============================================================
ALTER TABLE public.users ALTER COLUMN graduation_year DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN current_class_year DROP NOT NULL;

-- ============================================================
-- Trigger function: mirror auth.users → public.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- Backfill: create public.users rows for any existing auth.users
-- that don't already have one.
-- ============================================================
INSERT INTO public.users (id, email)
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
