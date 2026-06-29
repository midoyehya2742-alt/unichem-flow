-- Audit Triggers Migration
-- Automatically logs inserts, updates, and deletes for core tables

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id uuid;
  v_actor_name text;
  v_details jsonb;
BEGIN
  -- Get the current authenticated user's ID
  v_actor_id := auth.uid();
  
  -- If there is no authenticated user (e.g. system migrations or background tasks),
  -- skip logging to prevent constraint/foreign key failures
  IF v_actor_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Resolve actor name from profiles
  SELECT name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
  v_actor_name := COALESCE(v_actor_name, 'System');

  -- Construct JSON details of the change
  IF TG_OP = 'INSERT' THEN
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log changed fields to keep JSON compact
    v_details := jsonb_build_object(
      'old', (SELECT jsonb_object_agg(key, value) FROM jsonb_each(to_jsonb(OLD)) WHERE to_jsonb(NEW)->key IS DISTINCT FROM value),
      'new', (SELECT jsonb_object_agg(key, value) FROM jsonb_each(to_jsonb(NEW)) WHERE to_jsonb(OLD)->key IS DISTINCT FROM value)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  VALUES (
    v_actor_id,
    v_actor_name,
    LOWER(TG_OP),
    LOWER(TG_TABLE_NAME),
    COALESCE(NEW.id, OLD.id),
    v_details::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for core tables
DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_products_trigger ON public.products;
CREATE TRIGGER audit_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_deals_trigger ON public.deals;
CREATE TRIGGER audit_deals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
