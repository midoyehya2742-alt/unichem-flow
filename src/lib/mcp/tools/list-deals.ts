import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_deals",
  title: "List deals",
  description:
    "List deals visible to the signed-in UniChem user. Salesmen see their own deals; finance and admin see all. Supports optional filtering by deal status and payment status.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)."),
    deal_status: z
      .enum(["pending", "approved", "rejected", "delivered"])
      .optional()
      .describe("Filter by deal lifecycle status."),
    payment_status: z
      .enum(["unpaid", "partial", "paid"])
      .optional()
      .describe("Filter by payment status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, deal_status, payment_status }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("deals")
      .select(
        "id,reference,customer_name,salesman_name,total,currency,deal_status,payment_status,amount_paid,deal_date,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (deal_status) q = q.eq("deal_status", deal_status);
    if (payment_status) q = q.eq("payment_status", payment_status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { deals: data ?? [] },
    };
  },
});
