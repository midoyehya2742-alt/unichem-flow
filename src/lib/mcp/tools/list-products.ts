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
  name: "list_products",
  title: "List products",
  description:
    "List products from UniChem inventory. Optional search by SKU or name; optional low-stock filter.",
  inputSchema: {
    search: z.string().trim().min(1).optional(),
    low_stock_only: z.boolean().optional().describe("Only products at or below minimum stock."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, low_stock_only, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("products")
      .select("id,sku,name,category,unit,stock_quantity,minimum_stock_level,default_price,archived")
      .order("name", { ascending: true })
      .limit(limit ?? 50);
    if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    let rows = data ?? [];
    if (low_stock_only)
      rows = rows.filter((r: any) => (r.stock_quantity ?? 0) <= (r.minimum_stock_level ?? 0));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { products: rows },
    };
  },
});
