import { supabase } from "./supabase";
import type { Database } from "@/integrations/supabase/types";
import type { Customer, Product, User, CompanySettings } from "./types";
import { fromProfile, fromCustomer, fromProduct, fromSettings } from "./store";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type InventoryMovementRow = Database["public"]["Tables"]["inventory_movements"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(fromProfile);
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from("customers").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data.map(fromCustomer);
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data.map(fromProduct);
}

// "Raw" fetchers below return unjoined rows only. Joining with users/customers/
// products is done by the hooks in src/hooks/queries.ts so that those lookups
// share the query cache with useUsers()/useCustomers()/useProducts() instead of
// firing duplicate network requests every time deals/movements/audit are fetched.

export async function fetchDealsRaw(): Promise<DealRow[]> {
  const { data, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchDealsPaginatedRaw(page: number, pageSize: number, status?: string, q?: string): Promise<{ data: DealRow[], count: number }> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  let query = supabase.from("deals").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("payment_status", status);
  }
  if (q) {
    query = query.or(`reference.ilike.%${q}%,customer_name.ilike.%${q}%,salesman_name.ilike.%${q}%`);
  }

  const { data, error, count } = await query.range(start, end);
  if (error) throw error;
  return { data, count: count || 0 };
}

export async function fetchInventoryMovementsRaw(): Promise<InventoryMovementRow[]> {
  const { data, error } = await supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data;
}

export async function fetchInventoryMovementsPaginatedRaw(page: number, pageSize: number, q?: string): Promise<{ data: InventoryMovementRow[], count: number }> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  let query = supabase.from("inventory_movements").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (q) {
    // Note: product_name isn't directly on movement, but let's assume filtering by reason or type for now
    query = query.or(`reason.ilike.%${q}%,movement_type.ilike.%${q}%`);
  }

  const { data, error, count } = await query.range(start, end);
  if (error) throw error;
  return { data, count: count || 0 };
}

export async function fetchAuditLogsRaw(): Promise<AuditLogRow[]> {
  const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data;
}

// The audit_logs trigger always writes SQL verbs (insert/update/delete) and
// plural table names (deals/products/customers/profiles) — see
// supabase/migrations/20260629000001_audit_triggers.sql. The filter dropdowns
// show friendlier singular/verb labels, so map them to the stored DB values.
const AUDIT_ACTION_DB_VALUES: Record<string, string> = {
  create: "insert",
  update: "update",
  delete: "delete",
};
const AUDIT_ENTITY_DB_VALUES: Record<string, string> = {
  deal: "deals",
  product: "products",
  customer: "customers",
  profiles: "profiles",
};

export async function fetchAuditLogsPaginatedRaw(page: number, pageSize: number, q?: string, actionFilter?: string, entityFilter?: string): Promise<{ data: AuditLogRow[], count: number }> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  let query = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (q) {
    query = query.or(`action.ilike.%${q}%,entity.ilike.%${q}%`);
  }
  if (actionFilter && actionFilter !== "all") {
    query = query.eq("action", AUDIT_ACTION_DB_VALUES[actionFilter] ?? actionFilter);
  }
  if (entityFilter && entityFilter !== "all") {
    query = query.eq("entity", AUDIT_ENTITY_DB_VALUES[entityFilter] ?? entityFilter);
  }

  const { data, error, count } = await query.range(start, end);
  if (error) throw error;
  return { data, count: count || 0 };
}

export async function fetchDashboardStats() {
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) throw error;
  return data;
}

export async function fetchSettings(): Promise<CompanySettings> {
  const { data, error } = await supabase.from("company_settings").select("*").single();
  if (error && error.code !== "PGRST116") throw error; // ignore no rows
  if (data) return fromSettings(data);
  return { companyName: "UniChem ERP", defaultTax: 14, currency: "EGP" };
}
