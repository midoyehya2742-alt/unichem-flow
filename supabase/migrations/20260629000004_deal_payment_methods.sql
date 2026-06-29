alter table public.deals
  add column if not exists payment_type text,
  add column if not exists payment_method text,
  add column if not exists payment_info text,
  add column if not exists immediate_amount numeric(14, 3),
  add column if not exists cheques jsonb;

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
