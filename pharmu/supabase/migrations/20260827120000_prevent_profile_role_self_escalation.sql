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
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_block_role_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
