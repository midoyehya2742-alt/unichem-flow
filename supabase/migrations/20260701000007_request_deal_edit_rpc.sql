-- SECURITY DEFINER RPC so salesmen (who cannot UPDATE deals directly due to RLS)
-- can persist an edit request on their own deal.
CREATE OR REPLACE FUNCTION public.request_deal_edit(
  p_deal_id uuid,
  p_requested_by uuid,
  p_requested_by_name text,
  p_requested_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_role app_role;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get caller role from profiles
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  -- Load the deal
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found: %', p_deal_id;
  END IF;

  -- Only the deal's own salesman (or admin) may request an edit
  IF v_role NOT IN ('admin') AND v_deal.salesman_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised: you do not own this deal';
  END IF;

  -- Write the edit request into the jsonb column
  UPDATE public.deals
  SET
    edit_request = jsonb_build_object(
      'requestedBy',       p_requested_by,
      'requestedByName',   p_requested_by_name,
      'requestedAt',       p_requested_at,
      'status',            'pending'
    ),
    updated_at = now()
  WHERE id = p_deal_id;
END;
$$;
