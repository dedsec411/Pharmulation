-- Prevent a non-admin user from escalating their own role via a direct
-- UPDATE profiles SET role = 'admin' WHERE user_id = auth.uid() call.
-- RLS (profiles_update_own) already restricts updates to the caller's own
-- row, but does not restrict which columns can change; this trigger closes
-- that gap by reverting any role change attempted by a non-admin.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- A NULL auth.uid() means no end-user JWT is present. RLS only permits a
  -- profile UPDATE via profiles_update_own (auth.uid() = user_id), which no
  -- JWT-less caller can satisfy, so reaching this trigger with a NULL uid
  -- implies RLS was bypassed: the service-role key or direct SQL. Both are
  -- trusted server-side contexts and are allowed to change roles (this is how
  -- the admin panel's promote action works).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_role_self_escalation ON public.profiles;
CREATE TRIGGER profiles_block_role_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
