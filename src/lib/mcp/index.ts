import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDealsTool from "./tools/list-deals";
import getDealTool from "./tools/get-deal";
import listCustomersTool from "./tools/list-customers";
import listProductsTool from "./tools/list-products";

// The OAuth issuer must be the direct Supabase host (see app-mcp-server-authoring guidance).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "unichem-erp-mcp",
  title: "UniChem ERP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the UniChem ERP: list and inspect deals, customers, and products. All queries run as the authenticated user, so results respect their role (salesmen see only their own deals; finance and admin see all).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDealsTool, getDealTool, listCustomersTool, listProductsTool],
});
