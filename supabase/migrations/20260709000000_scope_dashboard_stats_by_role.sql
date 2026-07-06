-- get_dashboard_stats() previously aggregated public.deals with no filter,
-- so every salesman's dashboard showed company-wide totals and a
-- "top salesmen" leaderboard with other reps' names and revenue, even
-- though the deal list itself is correctly RLS-scoped to "my own deals"
-- for that role. Scope every aggregate to the caller when they are a
-- salesman; finance/admin continue to see company-wide figures.
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_scoped boolean;
  v_total NUMERIC;
  v_paid NUMERIC;
  v_pending INT;
  v_paid_count INT;
  v_partial_count INT;
  v_unpaid_count INT;
  v_low_stock_count INT;
  v_pending_edits JSON;
  v_7_days JSON;
  v_salesman_data JSON;
  v_movement_history JSON;
  v_revenue_mtd NUMERIC;
  v_revenue_last_month NUMERIC;
  v_current_month_start DATE := date_trunc('month', CURRENT_DATE);
  v_last_month_start DATE := date_trunc('month', CURRENT_DATE - INTERVAL '1 month');
  v_aging_current NUMERIC := 0;
  v_aging_30_60 NUMERIC := 0;
  v_aging_90_plus NUMERIC := 0;
  v_total_aging_days NUMERIC := 0;
  v_aging_deals_count INT := 0;
  v_avg_aging_days INT := 0;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  v_scoped := (v_role = 'salesman');

  SELECT COALESCE(SUM(total), 0), COALESCE(SUM(amount_paid), 0) INTO v_total, v_paid
    FROM public.deals WHERE (NOT v_scoped OR salesman_id = v_uid);
  SELECT COUNT(*) INTO v_pending FROM public.deals
    WHERE payment_status != 'paid' AND (NOT v_scoped OR salesman_id = v_uid);
  SELECT COUNT(*) INTO v_paid_count FROM public.deals
    WHERE payment_status = 'paid' AND (NOT v_scoped OR salesman_id = v_uid);
  SELECT COUNT(*) INTO v_partial_count FROM public.deals
    WHERE payment_status = 'partial' AND (NOT v_scoped OR salesman_id = v_uid);
  SELECT COUNT(*) INTO v_unpaid_count FROM public.deals
    WHERE payment_status = 'unpaid' AND (NOT v_scoped OR salesman_id = v_uid);
  SELECT COUNT(*) INTO v_low_stock_count FROM public.products WHERE stock_quantity <= minimum_stock_level;

  -- Pending edits array (scoped to the salesman's own deals when applicable)
  SELECT COALESCE(json_agg(row_to_json(d)), '[]') INTO v_pending_edits FROM public.deals d
    WHERE d.edit_request->>'status' = 'pending' AND (NOT v_scoped OR d.salesman_id = v_uid);

  SELECT COALESCE(SUM(total), 0) INTO v_revenue_mtd FROM public.deals
    WHERE deal_date >= v_current_month_start AND (NOT v_scoped OR salesman_id = v_uid);
  SELECT COALESCE(SUM(total), 0) INTO v_revenue_last_month FROM public.deals
    WHERE deal_date >= v_last_month_start AND deal_date < v_current_month_start
      AND (NOT v_scoped OR salesman_id = v_uid);

  -- Receivables Aging
  SELECT
    COALESCE(SUM(CASE WHEN CURRENT_DATE - deal_date::date <= 30 THEN total - amount_paid ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CURRENT_DATE - deal_date::date > 30 AND CURRENT_DATE - deal_date::date <= 60 THEN total - amount_paid ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CURRENT_DATE - deal_date::date > 60 THEN total - amount_paid ELSE 0 END), 0),
    COALESCE(SUM(CURRENT_DATE - deal_date::date), 0),
    COUNT(*)
  INTO v_aging_current, v_aging_30_60, v_aging_90_plus, v_total_aging_days, v_aging_deals_count
  FROM public.deals WHERE total - amount_paid > 0 AND (NOT v_scoped OR salesman_id = v_uid);

  IF v_aging_deals_count > 0 THEN
    v_avg_aging_days := ROUND(v_total_aging_days / v_aging_deals_count);
  END IF;

  -- Calculate last 7 days total grouped by day. The scoping predicate lives in
  -- the JOIN condition (not a WHERE) so days with zero matching deals still
  -- appear as a zero-value row instead of being dropped by the LEFT JOIN.
  SELECT json_agg(t) INTO v_7_days FROM (
    SELECT
      TO_CHAR(d, 'YYYY-MM-DD') AS day,
      COALESCE(SUM(deals.total), 0) AS total,
      COALESCE(SUM(deals.amount_paid), 0) AS amount_paid,
      COUNT(deals.id) AS count,
      COALESCE(SUM(deals.total), 0) - COALESCE(SUM(deals.amount_paid), 0) AS outstanding
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d
    LEFT JOIN public.deals ON TO_CHAR(deals.deal_date::date, 'YYYY-MM-DD') = TO_CHAR(d, 'YYYY-MM-DD')
      AND (NOT v_scoped OR deals.salesman_id = v_uid)
    GROUP BY d
    ORDER BY d ASC
  ) t;

  -- Top 5 Salesmen leaderboard: company-wide comparison data, not appropriate
  -- for a salesman to see other reps' names/revenue.
  IF v_scoped THEN
    v_salesman_data := '[]'::json;
  ELSE
    SELECT json_agg(t) INTO v_salesman_data FROM (
      SELECT
        salesman_name AS name,
        COALESCE(SUM(total), 0) AS total,
        COALESCE(SUM(amount_paid), 0) AS collected,
        COALESCE(SUM(total) - SUM(amount_paid), 0) AS outstanding
      FROM public.deals
      GROUP BY salesman_name
      ORDER BY COALESCE(SUM(total), 0) DESC
      LIMIT 5
    ) t;
  END IF;

  -- Inventory movement history is operational (warehouse-wide), not tied to
  -- an individual salesman's deals, so it stays unscoped.
  SELECT json_agg(m) INTO v_movement_history FROM (
    SELECT
      TO_CHAR(d, 'YYYY-MM-DD') AS date,
      COALESCE(SUM(CASE WHEN quantity_changed > 0 THEN quantity_changed ELSE 0 END), 0) AS inward,
      COALESCE(SUM(CASE WHEN quantity_changed < 0 THEN ABS(quantity_changed) ELSE 0 END), 0) AS outward
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d
    LEFT JOIN public.inventory_movements im ON TO_CHAR(im.created_at::date, 'YYYY-MM-DD') = TO_CHAR(d, 'YYYY-MM-DD')
    GROUP BY d
    ORDER BY d ASC
  ) m;

  RETURN json_build_object(
    'total', v_total,
    'total_deals', (SELECT COUNT(*) FROM public.deals WHERE (NOT v_scoped OR salesman_id = v_uid)),
    'paid', v_paid,
    'outstanding', v_total - v_paid,
    'pending_deals', v_pending,
    'paid_count', v_paid_count,
    'partial_count', v_partial_count,
    'unpaid_count', v_unpaid_count,
    'low_stock_count', v_low_stock_count,
    'pending_edits', v_pending_edits,
    'revenue_mtd', v_revenue_mtd,
    'revenue_last_month', v_revenue_last_month,
    'aging_current', v_aging_current,
    'aging_30_60', v_aging_30_60,
    'aging_90_plus', v_aging_90_plus,
    'avg_aging_days', v_avg_aging_days,
    'last_7_days', v_7_days,
    'top_salesmen', COALESCE(v_salesman_data, '[]'::json),
    'movement_history', COALESCE(v_movement_history, '[]'::json)
  );
END;
$function$;
