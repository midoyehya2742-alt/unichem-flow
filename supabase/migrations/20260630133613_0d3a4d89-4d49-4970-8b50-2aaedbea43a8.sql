
CREATE OR REPLACE FUNCTION public.request_deal_edit(p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
  values (v_user_id, v_name, 'update', 'deal', p_deal_id, 'Requested edit on deal ' || v_deal.reference);
end;
$$;

GRANT EXECUTE ON FUNCTION public.request_deal_edit(uuid) TO authenticated;
