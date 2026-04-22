-- Restrict signups to @bryant.edu emails only.
-- This trigger fires BEFORE a new user is inserted into auth.users
-- and rejects any email that doesn't end with @bryant.edu.

CREATE OR REPLACE FUNCTION public.enforce_bryant_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@bryant.edu') THEN
        RAISE EXCEPTION 'Only @bryant.edu email addresses can create accounts.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to auth.users so Supabase Auth signups are validated server-side
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_bryant_email_trigger'
    ) THEN
        CREATE TRIGGER enforce_bryant_email_trigger
            BEFORE INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.enforce_bryant_email();
    END IF;
END;
$$;
