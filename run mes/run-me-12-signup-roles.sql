-- Which roles a person may give themselves at sign-up.
--
-- handle_new_user took the role straight from raw_user_meta_data, which is
-- whatever the browser put in signUp's `options.data`. The form offered only
-- student and graduate, but the form is not what decides: a crafted signUp
-- call with role "admin" made an admin, and the existing
-- prevent_role_self_escalation trigger did not catch it because that guards
-- UPDATE and this is the INSERT at account creation.
--
-- The fix is a whitelist rather than a stricter client. Educator is on it
-- deliberately - a lecturer signs up as one - and admin never is, because
-- admin can read every profile in the database.
--
-- What an unverified educator can actually reach is worth stating, since
-- anyone may now claim to be one: they can create classes and read the work
-- of students who typed their join code, and nothing else. teaches_student
-- grants access through enrolment in a class they own, so a false educator
-- with no students sees an empty product.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  claimed text := NEW.raw_user_meta_data->>'role';
  granted public.user_role;
BEGIN
  -- Compared as text: an unrecognised string must fall through to student,
  -- and casting one that is not in the enum raises instead.
  granted := CASE claimed
    WHEN 'student'  THEN 'student'::public.user_role
    WHEN 'graduate' THEN 'graduate'::public.user_role
    WHEN 'pharmd'   THEN 'pharmd'::public.user_role
    WHEN 'educator' THEN 'educator'::public.user_role
    ELSE 'student'::public.user_role
  END;

  INSERT INTO public.profiles (user_id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    granted,
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- Anyone who already granted themselves admin this way keeps it only if a
-- human meant them to. Nothing is demoted automatically - that would lock a
-- legitimate admin out of their own project - but the accounts are worth
-- looking at, so this reports them rather than changing them.
DO $$
DECLARE
  suspect record;
BEGIN
  FOR suspect IN
    SELECT p.email, u.raw_user_meta_data->>'role' AS claimed_at_signup
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.role = 'admin' AND u.raw_user_meta_data->>'role' = 'admin'
  LOOP
    RAISE WARNING 'Account % is admin and claimed that role at sign-up. Confirm it was intended.',
      suspect.email;
  END LOOP;
END $$;
