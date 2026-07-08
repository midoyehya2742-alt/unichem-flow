-- Fixes three "silently broken / silently permissive" issues found in the
-- static scan:
--
--  1. Deleting a deal was a no-op: there is no DELETE RLS policy on public.deals,
--     so the client's raw `.delete()` matched zero rows and returned no error
--     while the UI reported success. Provide a SECURITY DEFINER RPC that also
--     restores the stock the deal consumed (every deal decrements stock at
--     creation) and writes the movement trail. Deletion itself is audited by the
--     existing audit_deals_trigger.
--
--  2. "Deleting" a user is unsafe as a hard delete — deals / inventory_movements
--     / audit_logs all FK to auth.users with no cascade — and a raw profiles
--     delete lacked the table grant and silently no-op'd. Replace it with a
--     deactivate (revoke-access) RPC that preserves historical records.
--
--  3. Deactivated users could still read all business data: customers/products
--     SELECT was `using (true)` and the deals salesman self-read branch was not
--     active-gated. current_user_role() already returns NULL for inactive/absent
--     users, so require a non-null role.

-- 1. Delete a deal (admin/finance) and restore its consumed stock. --------------
create or replace function public.delete_deal_with_inventory(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
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

revoke execute on function public.delete_deal_with_inventory(uuid) from anon, public;
grant execute on function public.delete_deal_with_inventory(uuid) to authenticated;

-- 2. Deactivate (revoke access to) a user — admin only. -------------------------
create or replace function public.deactivate_app_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_actor_role public.app_role;
begin
  select role into v_actor_role from public.profiles where id = auth.uid() and active = true;
  if v_actor_role is null then
    raise exception 'Not authenticated.';
  end if;
  if v_actor_role <> 'admin' then
    raise exception 'Only Admin can revoke user access.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot revoke your own access.';
  end if;

  update public.profiles set active = false where id = p_user_id;
end;
$function$;

revoke execute on function public.deactivate_app_user(uuid) from anon, public;
grant execute on function public.deactivate_app_user(uuid) to authenticated;

-- 3. Require an active role to read business data. ------------------------------
drop policy if exists "customers select authenticated" on public.customers;
create policy "customers select authenticated"
  on public.customers for select to authenticated
  using (public.current_user_role() is not null);

drop policy if exists "products select authenticated" on public.products;
create policy "products select authenticated"
  on public.products for select to authenticated
  using (public.current_user_role() is not null);

drop policy if exists "deals select owner or finance admin" on public.deals;
create policy "deals select owner or finance admin"
  on public.deals for select to authenticated
  using (
    (salesman_id = auth.uid() and public.current_user_role() is not null)
    or public.is_admin_or_finance()
  );
