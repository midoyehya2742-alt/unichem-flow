-- Adding a finance/collaboration note wrote through a direct deals UPDATE, which
-- RLS restricts to finance/admin — so a salesman commenting on their OWN deal
-- (the UI explicitly offers this) silently failed. Provide a SECURITY DEFINER
-- RPC that lets finance/admin, or the deal's own salesman, append a note.
create or replace function public.append_deal_note(p_deal_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_role public.app_role;
  v_user_id uuid := auth.uid();
  v_name text;
  v_deal public.deals%rowtype;
  v_note jsonb;
begin
  select role, name into v_role, v_name from public.profiles where id = v_user_id and active = true;
  if v_role is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_deal from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Deal not found.';
  end if;

  if v_role not in ('admin', 'finance') and v_deal.salesman_id <> v_user_id then
    raise exception 'You can only comment on your own deals.';
  end if;

  if length(coalesce(trim(p_text), '')) = 0 then
    raise exception 'Note cannot be empty.';
  end if;

  v_note := jsonb_build_object(
    'id',         gen_random_uuid()::text,
    'authorId',   v_user_id::text,
    'authorName', v_name,
    'text',       p_text,
    'createdAt',  to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  update public.deals
  set finance_notes = coalesce(finance_notes, '[]'::jsonb) || v_note,
      updated_at = now()
  where id = p_deal_id;
end;
$function$;

revoke execute on function public.append_deal_note(uuid, text) from anon, public;
grant execute on function public.append_deal_note(uuid, text) to authenticated;
