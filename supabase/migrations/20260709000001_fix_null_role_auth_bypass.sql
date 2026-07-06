-- CRITICAL SECURITY FIX
--
-- adjust_inventory, create_deal_with_inventory, update_deal_with_inventory,
-- create_app_user, and update_app_user all gated access with checks like
-- `IF v_role NOT IN ('admin','finance') THEN RAISE EXCEPTION ...` or
-- `IF v_actor_role <> 'admin' THEN RAISE EXCEPTION ...`.
--
-- In PL/pgSQL, a NULL condition is treated as FALSE by IF, not as "deny by
-- default". When there is no authenticated user, auth.uid() is NULL, so
-- v_role/v_actor_role is NULL, so `NOT IN (...)` and `<> 'admin'` both
-- evaluate to NULL, and the RAISE EXCEPTION is silently skipped. This was
-- confirmed live: calling adjust_inventory with only the public anon key
-- (no session) skipped straight past the role check.
--
-- Fix: explicitly deny when the resolved role is NULL, before any NOT IN/<>
-- comparison runs. request_deal_edit already did this correctly
-- (`IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated.'`) — these
-- five did not.
--
-- update_deal_with_inventory also lacked the ownership check that its
-- sibling create_deal_with_inventory and request_deal_edit both have: a
-- salesman could edit another salesman's approved deal. Adding that too.

CREATE OR REPLACE FUNCTION public.adjust_inventory(p_product_id uuid, p_quantity_after numeric, p_movement_type inventory_movement_type, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role public.app_role;
  v_user_id uuid := auth.uid();
  v_actor_name text;
  v_product public.products%rowtype;
  v_movement_id uuid := gen_random_uuid();
begin
  select role, name into v_role, v_actor_name from public.profiles where id = v_user_id and active = true;
  if v_role is null then
    raise exception 'Not authenticated.';
  end if;
  if v_role not in ('admin', 'finance') then
    raise exception 'Only Finance or Admin can adjust inventory.';
  end if;
  if p_quantity_after < 0 then
    raise exception 'Quantity cannot be negative.';
  end if;
  if p_movement_type not in ('increase', 'decrease', 'correction') then
    raise exception 'Invalid manual adjustment type.';
  end if;

  select * into v_product from public.products where id = p_product_id and archived = false for update;
  if not found then
    raise exception 'Product is not available.';
  end if;

  update public.products set stock_quantity = p_quantity_after, updated_at = now() where id = p_product_id;

  insert into public.inventory_movements (
    id, product_id, product_name, movement_type, quantity_before, quantity_after,
    quantity_changed, reason, actor_id, actor_name
  ) values (
    v_movement_id, p_product_id, v_product.name, p_movement_type, v_product.stock_quantity,
    p_quantity_after, p_quantity_after - v_product.stock_quantity, p_reason, v_user_id, v_actor_name
  );

  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (v_user_id, v_actor_name, 'update', 'inventory', p_product_id, 'Adjusted ' || v_product.name || ' from ' || v_product.stock_quantity || ' to ' || p_quantity_after);

  return v_movement_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_deal_with_inventory(p_deal jsonb, p_override_stock boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role public.app_role;
  v_actor_name text;
  v_user_id uuid := auth.uid();
  v_deal_id uuid := coalesce((p_deal->>'id')::uuid, gen_random_uuid());
  v_line jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_before numeric;
  v_after numeric;
begin
  select role, name into v_role, v_actor_name from public.profiles where id = v_user_id and active = true;
  if v_role is null then
    raise exception 'Not authenticated.';
  end if;
  if v_role not in ('salesman', 'admin') then
    raise exception 'Only Salesman or Admin can submit deals.';
  end if;

  if (p_deal->>'salesman_id')::uuid <> v_user_id then
    raise exception 'Cannot submit a deal for another user.';
  end if;

  if p_override_stock and v_role <> 'admin' then
    raise exception 'Only Admin can override stock validation.';
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_deal->'lines', '[]'::jsonb)) loop
    v_qty := coalesce((v_line->>'quantity')::numeric, 0);
    if v_qty <= 0 then
      raise exception 'Deal quantity must be greater than zero.';
    end if;

    select * into v_product
    from public.products
    where id = (v_line->>'productId')::uuid and archived = false
    for update;

    if not found then
      raise exception 'Product is not available.';
    end if;

    if v_product.stock_quantity < v_qty and not p_override_stock then
      raise exception 'Warning: Not enough inventory available.';
    end if;
  end loop;

  insert into public.deals (
    id, reference, salesman_id, salesman_name, customer_id, customer_name,
    lines, subtotal, discount, tax, total, currency, payment_status, amount_paid,
    deal_status, notes, finance_notes, attachments, deal_date, expected_payment_date,
    payment_type, payment_method, payment_info, immediate_amount, cheques,
    created_at, updated_at
  ) values (
    v_deal_id,
    p_deal->>'reference',
    (p_deal->>'salesman_id')::uuid,
    p_deal->>'salesman_name',
    (p_deal->>'customer_id')::uuid,
    p_deal->>'customer_name',
    coalesce(p_deal->'lines', '[]'::jsonb),
    coalesce((p_deal->>'subtotal')::numeric, 0),
    coalesce((p_deal->>'discount')::numeric, 0),
    coalesce((p_deal->>'tax')::numeric, 0),
    coalesce((p_deal->>'total')::numeric, 0),
    coalesce(p_deal->>'currency', 'EGP'),
    coalesce((p_deal->>'payment_status')::public.payment_status, 'unpaid'),
    coalesce((p_deal->>'amount_paid')::numeric, 0),
    coalesce((p_deal->>'deal_status')::public.deal_status, 'pending'),
    p_deal->>'notes',
    coalesce(p_deal->'finance_notes', '[]'::jsonb),
    coalesce(p_deal->'attachments', '[]'::jsonb),
    coalesce((p_deal->>'deal_date')::timestamptz, now()),
    nullif(p_deal->>'expected_payment_date', '')::timestamptz,
    p_deal->>'payment_type',
    p_deal->>'payment_method',
    p_deal->>'payment_info',
    (p_deal->>'immediate_amount')::numeric,
    p_deal->'cheques',
    now(),
    now()
  );

  for v_line in select * from jsonb_array_elements(coalesce(p_deal->'lines', '[]'::jsonb)) loop
    v_qty := (v_line->>'quantity')::numeric;
    select * into v_product from public.products where id = (v_line->>'productId')::uuid for update;
    v_before := v_product.stock_quantity;
    v_after := greatest(0, v_before - v_qty);

    update public.products
    set stock_quantity = v_after, updated_at = now()
    where id = v_product.id;

    insert into public.inventory_movements (
      product_id, product_name, movement_type, quantity_before, quantity_after,
      quantity_changed, reason, deal_id, deal_reference, actor_id, actor_name
    ) values (
      v_product.id,
      v_product.name,
      (case when p_override_stock and v_before < v_qty then 'override-sale' else 'sale' end)::public.inventory_movement_type,
      v_before,
      v_after,
      v_after - v_before,
      'Deal ' || (p_deal->>'reference'),
      v_deal_id,
      p_deal->>'reference',
      v_user_id,
      v_actor_name
    );
  end loop;

  return v_deal_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_deal_with_inventory(p_deal jsonb, p_override_stock boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role public.app_role;
  v_actor_name text;
  v_user_id uuid := auth.uid();
  v_deal_id uuid := (p_deal->>'id')::uuid;
  v_old_deal public.deals%rowtype;
  v_line jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_before numeric;
  v_after numeric;
begin
  select role, name into v_role, v_actor_name from public.profiles where id = v_user_id and active = true;
  if v_role is null then
    raise exception 'Not authenticated.';
  end if;
  if v_role not in ('admin', 'finance', 'salesman') then
    raise exception 'Only Admin, Finance, or Salesman can update deals.';
  end if;

  -- Get old deal
  select * into v_old_deal from public.deals where id = v_deal_id for update;
  if not found then
    raise exception 'Deal not found.';
  end if;

  -- Salesman guard: can only edit their own deals, and only once approved
  if v_role = 'salesman' and v_old_deal.salesman_id <> v_user_id then
    raise exception 'Salesman can only edit their own deals.';
  end if;
  if v_role = 'salesman' and v_old_deal.deal_status <> 'approved' then
    raise exception 'Salesman can only edit approved deals.';
  end if;

  -- Step 1: Revert old stock
  for v_line in select * from jsonb_array_elements(coalesce(v_old_deal.lines, '[]'::jsonb)) loop
    v_qty := coalesce((v_line->>'quantity')::numeric, 0);
    select * into v_product from public.products where id = (v_line->>'productId')::uuid for update;
    if found then
      v_before := v_product.stock_quantity;
      v_after := v_before + v_qty;

      update public.products
      set stock_quantity = v_after, updated_at = now()
      where id = v_product.id;

      insert into public.inventory_movements (
        product_id, product_name, movement_type, quantity_before, quantity_after,
        quantity_changed, reason, deal_id, deal_reference, actor_id, actor_name
      ) values (
        v_product.id,
        v_product.name,
        'increase'::public.inventory_movement_type,
        v_before,
        v_after,
        v_after - v_before,
        'Revert Deal ' || v_old_deal.reference || ' for edit',
        v_deal_id,
        v_old_deal.reference,
        v_user_id,
        v_actor_name
      );
    end if;
  end loop;

  -- Step 2: Validate and apply new stock
  for v_line in select * from jsonb_array_elements(coalesce(p_deal->'lines', '[]'::jsonb)) loop
    v_qty := coalesce((v_line->>'quantity')::numeric, 0);
    if v_qty <= 0 then
      raise exception 'Deal quantity must be greater than zero.';
    end if;

    select * into v_product from public.products where id = (v_line->>'productId')::uuid and archived = false for update;
    if not found then
      raise exception 'Product is not available.';
    end if;

    if v_product.stock_quantity < v_qty and not p_override_stock then
      raise exception 'Warning: Not enough inventory available.';
    end if;

    -- Apply new stock
    v_before := v_product.stock_quantity;
    v_after := greatest(0, v_before - v_qty);

    update public.products
    set stock_quantity = v_after, updated_at = now()
    where id = v_product.id;

    insert into public.inventory_movements (
      product_id, product_name, movement_type, quantity_before, quantity_after,
      quantity_changed, reason, deal_id, deal_reference, actor_id, actor_name
    ) values (
      v_product.id,
      v_product.name,
      (case when p_override_stock and v_before < v_qty then 'override-sale' else 'sale' end)::public.inventory_movement_type,
      v_before,
      v_after,
      v_after - v_before,
      'Edit Deal ' || (p_deal->>'reference'),
      v_deal_id,
      p_deal->>'reference',
      v_user_id,
      v_actor_name
    );
  end loop;

  -- Step 3: Update the deal table record
  update public.deals
  set
    customer_id = (p_deal->>'customer_id')::uuid,
    customer_name = p_deal->>'customer_name',
    lines = coalesce(p_deal->'lines', '[]'::jsonb),
    subtotal = coalesce((p_deal->>'subtotal')::numeric, 0),
    discount = coalesce((p_deal->>'discount')::numeric, 0),
    tax = coalesce((p_deal->>'tax')::numeric, 0),
    total = coalesce((p_deal->>'total')::numeric, 0),
    payment_status = coalesce((p_deal->>'payment_status')::public.payment_status, 'unpaid'),
    amount_paid = coalesce((p_deal->>'amount_paid')::numeric, 0),
    deal_status = coalesce((p_deal->>'deal_status')::public.deal_status, 'pending'),
    notes = p_deal->>'notes',
    finance_notes = coalesce(p_deal->'finance_notes', '[]'::jsonb),
    attachments = coalesce(p_deal->'attachments', '[]'::jsonb),
    payment_type = p_deal->>'payment_type',
    payment_method = p_deal->>'payment_method',
    payment_info = p_deal->>'payment_info',
    immediate_amount = (p_deal->>'immediate_amount')::numeric,
    cheques = p_deal->'cheques',
    deal_date = coalesce((p_deal->>'deal_date')::timestamptz, now()),
    expected_payment_date = nullif(p_deal->>'expected_payment_date', '')::timestamptz,
    updated_at = now()
  where id = v_deal_id;

  return v_deal_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_app_user(p_email text, p_password text, p_name text, p_role app_role, p_phone text DEFAULT NULL::text, p_department text DEFAULT NULL::text, p_active boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_actor_role public.app_role;
  v_id uuid := gen_random_uuid();
begin
  select role into v_actor_role from public.profiles where id = auth.uid() and active = true;
  if v_actor_role is null then
    raise exception 'Not authenticated.';
  end if;
  if v_actor_role <> 'admin' then
    raise exception 'Only Admin can create users.';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_id, 'authenticated', 'authenticated',
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('name', p_name, 'email_verified', true),
    now(), now(), false, false
  );

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (
    gen_random_uuid(), v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now()
  );

  -- handle_new_user trigger already inserted a basic profile row; update it with full details
  update public.profiles
  set name = p_name, role = p_role, phone = p_phone, department = p_department, active = p_active
  where id = v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_app_user(p_user_id uuid, p_email text, p_password text, p_name text, p_role app_role, p_phone text DEFAULT NULL::text, p_department text DEFAULT NULL::text, p_active boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_actor_role public.app_role;
begin
  select role into v_actor_role from public.profiles where id = auth.uid() and active = true;
  if v_actor_role is null then
    raise exception 'Not authenticated.';
  end if;
  if v_actor_role <> 'admin' then
    raise exception 'Only Admin can update users.';
  end if;

  if p_password is not null and length(p_password) > 0 then
    if length(p_password) < 6 then
      raise exception 'Password must be at least 6 characters.';
    end if;
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now()
    where id = p_user_id;
  end if;

  if p_email is not null and length(p_email) > 0 then
    update auth.users
    set email = lower(p_email),
        updated_at = now()
    where id = p_user_id;

    update auth.identities
    set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(lower(p_email)))
    where user_id = p_user_id and provider = 'email';

    update public.profiles
    set email = lower(p_email)
    where id = p_user_id;
  end if;

  update public.profiles
  set name = p_name, role = p_role, phone = p_phone, department = p_department, active = p_active
  where id = p_user_id;

end;
$function$;
