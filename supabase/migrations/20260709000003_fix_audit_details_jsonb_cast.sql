-- Migration 20260708000000_audit_fixes.sql (DB-02) changed audit_logs.details
-- from text to jsonb, but adjust_inventory and request_deal_edit still built
-- it as a plain concatenated string and inserted it directly. A bare string
-- like 'Adjusted Iron Oxide from 10 to 20' is not valid JSON (unquoted, has
-- spaces), so Postgres rejects the implicit text->jsonb cast with
-- "invalid input syntax for type json" (confirmed live). This meant every
-- inventory adjustment and every "Request Edit" submission was failing
-- outright, since the whole transaction rolls back when that INSERT throws.
--
-- Fix: wrap the message in jsonb_build_object('message', ...) so it's valid
-- JSON. The frontend (audit.tsx) is updated in the same change to render a
-- {message: "..."} details value as plain text, alongside the existing
-- {old: ..., new: ...} diff shape produced by the log_audit_event() trigger.

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
  values (v_user_id, v_actor_name, 'update', 'inventory', p_product_id, jsonb_build_object('message', 'Adjusted ' || v_product.name || ' from ' || v_product.stock_quantity || ' to ' || p_quantity_after));

  return v_movement_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_deal_edit(p_deal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_role public.app_role;
  v_name text;
  v_deal public.deals%rowtype;
  v_edit_request jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select role, name into v_role, v_name
  from public.profiles where id = v_user_id and active = true;

  select * into v_deal from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Deal not found.';
  end if;

  if v_role = 'salesman' and v_deal.salesman_id <> v_user_id then
    raise exception 'You can only request edits on your own deals.';
  end if;

  if v_role not in ('salesman', 'admin', 'finance') then
    raise exception 'Not allowed.';
  end if;

  v_edit_request := jsonb_build_object(
    'requestedBy', v_user_id::text,
    'requestedByName', v_name,
    'requestedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'status', 'pending'
  );

  update public.deals
  set edit_request = v_edit_request,
      updated_at = now()
  where id = p_deal_id;

  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (v_user_id, v_name, 'update', 'deal', p_deal_id, jsonb_build_object('message', 'Requested edit on deal ' || v_deal.reference));
end;
$function$;
