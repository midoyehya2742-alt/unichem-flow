-- Enforce the edit-request workflow at the DB layer, not just via UI button
-- visibility. Previously a salesman could bypass "Request Edit" entirely by
-- navigating straight to /deals/:id/edit (client-side guard only checked
-- deal_status) or by calling update_deal_with_inventory directly (it only
-- checked ownership + deal_status, never edit_request.status). Now a
-- salesman must have an edit_request with status = 'approved' on the deal
-- before update_deal_with_inventory will let them touch it, and a
-- successful salesman-initiated edit consumes that approval (resets
-- edit_request to NULL) so a further edit needs a fresh request.
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

  -- Salesman guard: own deal only, deal itself must be approved, and there
  -- must be an approved edit request — the "Request Edit" flow is mandatory,
  -- not optional, for a salesman.
  if v_role = 'salesman' and v_old_deal.salesman_id <> v_user_id then
    raise exception 'Salesman can only edit their own deals.';
  end if;
  if v_role = 'salesman' and v_old_deal.deal_status <> 'approved' then
    raise exception 'Salesman can only edit approved deals.';
  end if;
  if v_role = 'salesman' and coalesce(v_old_deal.edit_request->>'status', '') <> 'approved' then
    raise exception 'You must submit an edit request and have it approved before editing this deal.';
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

  -- Step 3: Update the deal table record. A salesman's edit consumes the
  -- approval it required, so a subsequent edit needs a fresh request; an
  -- admin/finance edit leaves edit_request untouched (they aren't gated by it).
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
    edit_request = case when v_role = 'salesman' then null else edit_request end,
    updated_at = now()
  where id = v_deal_id;

  return v_deal_id;
end;
$function$;
