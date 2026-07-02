
-- 1. DEALS: restrict SELECT to owner or finance/admin; consolidate UPDATE policy
DROP POLICY IF EXISTS "deals read all authenticated" ON public.deals;
DROP POLICY IF EXISTS "deals update finance admin" ON public.deals;
DROP POLICY IF EXISTS "finance/admin update deals" ON public.deals;

CREATE POLICY "deals select owner or finance admin"
  ON public.deals FOR SELECT TO authenticated
  USING (salesman_id = auth.uid() OR public.is_admin_or_finance());

CREATE POLICY "deals update finance admin"
  ON public.deals FOR UPDATE TO authenticated
  USING (public.is_admin_or_finance())
  WITH CHECK (public.is_admin_or_finance());

-- 2. CUSTOMERS: drop duplicate SELECT; keep single authenticated SELECT (needed for deal entry);
--    restrict UPDATE to finance/admin; keep INSERT open to authenticated for inline creation.
DROP POLICY IF EXISTS "all read customers/products" ON public.customers;
DROP POLICY IF EXISTS "auth update customers" ON public.customers;
DROP POLICY IF EXISTS "auth write customers" ON public.customers;
DROP POLICY IF EXISTS "customers insert authenticated" ON public.customers;
DROP POLICY IF EXISTS "customers read authenticated" ON public.customers;
DROP POLICY IF EXISTS "customers update authenticated" ON public.customers;

CREATE POLICY "customers select authenticated"
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "customers insert authenticated"
  ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customers update finance admin"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_admin_or_finance())
  WITH CHECK (public.is_admin_or_finance());

CREATE POLICY "customers delete admin"
  ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. PRODUCTS: consolidate duplicates
DROP POLICY IF EXISTS "all read products" ON public.products;
DROP POLICY IF EXISTS "products read authenticated" ON public.products;
DROP POLICY IF EXISTS "finance/admin manage products" ON public.products;
DROP POLICY IF EXISTS "products manage finance admin" ON public.products;

CREATE POLICY "products select authenticated"
  ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "products manage finance admin"
  ON public.products FOR ALL TO authenticated
  USING (public.is_admin_or_finance())
  WITH CHECK (public.is_admin_or_finance());

-- 4. COMPANY_SETTINGS: dedup SELECT
DROP POLICY IF EXISTS "settings read all" ON public.company_settings;
DROP POLICY IF EXISTS "settings read authenticated" ON public.company_settings;

CREATE POLICY "settings select authenticated"
  ON public.company_settings FOR SELECT TO authenticated USING (true);

-- 5. STORAGE: deal-attachments — restrict SELECT and INSERT by deal ownership.
--    Path convention: deals/{deal_id}/{file}. We look up the deal by id.
DROP POLICY IF EXISTS "deal attachments read" ON storage.objects;
DROP POLICY IF EXISTS "deal attachments insert" ON storage.objects;

CREATE POLICY "deal attachments read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-attachments'
    AND (
      public.is_admin_or_finance()
      OR EXISTS (
        SELECT 1 FROM public.deals d
        WHERE d.id::text = split_part(storage.objects.name, '/', 2)
          AND d.salesman_id = auth.uid()
      )
    )
  );

CREATE POLICY "deal attachments insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-attachments'
    AND (
      public.is_admin_or_finance()
      OR EXISTS (
        SELECT 1 FROM public.deals d
        WHERE d.id::text = split_part(storage.objects.name, '/', 2)
          AND d.salesman_id = auth.uid()
      )
    )
  );

-- 6. Lock down search_path on the audit trigger function
CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_actor_id uuid;
  v_actor_name text;
  v_details jsonb;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  SELECT name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
  v_actor_name := COALESCE(v_actor_name, 'System');

  IF TG_OP = 'INSERT' THEN
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object(
      'old', (SELECT jsonb_object_agg(key, value) FROM jsonb_each(to_jsonb(OLD)) WHERE to_jsonb(NEW)->key IS DISTINCT FROM value),
      'new', (SELECT jsonb_object_agg(key, value) FROM jsonb_each(to_jsonb(NEW)) WHERE to_jsonb(OLD)->key IS DISTINCT FROM value)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  VALUES (v_actor_id, v_actor_name, LOWER(TG_OP), LOWER(TG_TABLE_NAME), COALESCE(NEW.id, OLD.id), v_details::text);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

-- 7. Drop the obsolete 4-arg request_deal_edit overload (client uses the 1-arg RPC)
DROP FUNCTION IF EXISTS public.request_deal_edit(uuid, uuid, text, timestamptz);

-- 8. Revoke public execute on admin-only user-management functions
REVOKE EXECUTE ON FUNCTION public.create_app_user(text, text, text, app_role, text, text, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_app_user(uuid, text, text, text, app_role, text, text, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_app_user(text, text, text, app_role, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_app_user(uuid, text, text, text, app_role, text, text, boolean) TO authenticated;
