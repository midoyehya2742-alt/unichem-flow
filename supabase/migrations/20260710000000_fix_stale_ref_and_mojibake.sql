-- Corrective migration for two bugs:
--
-- 1. create_deal_with_inventory used p_deal->>'reference' (the client-supplied
--    value) for inventory movement inserts, but the set_deal_reference() BEFORE
--    INSERT trigger has already overwritten NEW.reference with the auto-generated
--    DL-YY-NNNN value.  Result: inventory_movements.deal_reference contains the
--    stale, pre-trigger reference the client passed.
--    Fix: after the INSERT, SELECT reference INTO v_actual_ref from the just-
--    inserted deals row, and use v_actual_ref in the movement loop.
--
-- 2. delete_deal_with_inventory had an em dash (U+2014) in the reason string
--    literal.  When the migration was applied through PowerShell, the em dash
--    was double-UTF8-encoded, producing mojibake (â€") in the live function
--    source and in any movement records it wrote.
--    Fix: replace the em dash with a plain ASCII hyphen-minus, and clean up
--    the one already-corrupted inventory_movement row.

-- ============================================================================
-- 1. Recreate create_deal_with_inventory with the stale-reference fix
-- ============================================================================
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
  v_actual_ref text;
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

  -- Read back the trigger-assigned reference (set_deal_reference BEFORE INSERT
  -- trigger overwrites NEW.reference with the auto-generated DL-YY-NNNN value).
  select reference into v_actual_ref from public.deals where id = v_deal_id;

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
      'Deal ' || v_actual_ref,
      v_deal_id,
      v_actual_ref,
      v_user_id,
      v_actor_name
    );
  end loop;

  return v_deal_id;
end;
$function$;

-- ============================================================================
-- 2. Recreate delete_deal_with_inventory with ASCII hyphen (no em dash)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_deal_with_inventory(p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role public.app_role;
  v_actor_name text;
  v_user_id uuid := auth.uid();
  v_deal public.deals%rowtype;
  v_line jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_before numeric;
  v_after numeric;
begin
  select role, name into v_role, v_actor_name
  from public.profiles where id = v_user_id and active = true;
  if v_role is null then
    raise exception 'Not authenticated.';
  end if;
  if v_role not in ('admin', 'finance') then
    raise exception 'Only Finance or Admin can delete deals.';
  end if;

  select * into v_deal from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Deal not found.';
  end if;

  -- Every deal decremented stock at creation, so deleting it returns that stock.
  for v_line in select * from jsonb_array_elements(coalesce(v_deal.lines, '[]'::jsonb)) loop
    v_qty := coalesce((v_line->>'quantity')::numeric, 0);
    if v_qty <= 0 then
      continue;
    end if;
    select * into v_product from public.products where id = (v_line->>'productId')::uuid for update;
    if found then
      v_before := v_product.stock_quantity;
      v_after := v_before + v_qty;
      update public.products set stock_quantity = v_after, updated_at = now() where id = v_product.id;
      insert into public.inventory_movements (
        product_id, product_name, movement_type, quantity_before, quantity_after,
        quantity_changed, reason, deal_id, deal_reference, actor_id, actor_name
      ) values (
        v_product.id, v_product.name, 'increase'::public.inventory_movement_type,
        v_before, v_after, v_after - v_before,
        'Restore stock - deal ' || v_deal.reference || ' deleted',
        null, v_deal.reference, v_user_id, v_actor_name
      );
    end if;
  end loop;

  delete from public.deals where id = p_deal_id;
end;
$function$;

-- ============================================================================
-- 3. Clean up corrupted historical data
-- ============================================================================

-- Fix mojibake in any existing movement reason text
UPDATE public.inventory_movements
SET reason = REPLACE(reason, E'\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u0153', '-')
WHERE reason LIKE E'%\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u0153%';

-- Broader catch: the double-encoding of U+2014 EM DASH produces the bytes
-- C3 A2 E2 82 AC E2 80 9C which render as "â€"" in latin1.  Try the
-- literal mojibake string as well.
UPDATE public.inventory_movements
SET reason = REPLACE(reason, E'\u00e2\u20ac\u201c', '-')
WHERE reason LIKE E'%\u00e2\u20ac\u201c%';

-- Fix the one known stale reference from the pre-trigger-fix era
UPDATE public.inventory_movements
SET deal_reference = 'DL-26-1000',
    reason = 'Deal DL-26-1000'
WHERE deal_reference = 'DL-26-97ML';
