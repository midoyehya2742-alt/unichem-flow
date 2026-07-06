import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  fetchUsers, fetchCustomers, fetchProducts, fetchSettings,
  fetchDealsRaw, fetchDealsPaginatedRaw,
  fetchInventoryMovementsRaw, fetchInventoryMovementsPaginatedRaw,
  fetchAuditLogsRaw, fetchAuditLogsPaginatedRaw,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { fromDeal, fromMovement, fromAudit, toCustomer, toProduct, toDeal, nowIso } from "@/lib/store";
import type { Database } from "@/integrations/supabase/types";
import type { Customer, Deal, EditRequest, InventoryMovement, Product, User } from "@/lib/types";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];

export const keys = {
  users: ["users"] as const,
  customers: ["customers"] as const,
  products: ["products"] as const,
  deals: ["deals"] as const,
  dealsRaw: ["deals", "raw"] as const,
  dealsPaginated: (page: number, size: number, status?: string, q?: string) => ["deals", "paginated", page, size, status, q] as const,
  inventory: ["inventory"] as const,
  inventoryRaw: ["inventory", "raw"] as const,
  inventoryPaginated: (page: number, size: number, q?: string) => ["inventory", "paginated", page, size, q] as const,
  audit: ["audit"] as const,
  auditRaw: ["audit", "raw"] as const,
  auditPaginated: (page: number, size: number, q?: string, actionFilter?: string, entityFilter?: string) => ["audit", "paginated", page, size, q, actionFilter, entityFilter] as const,
  settings: ["settings"] as const,
  dashboardStats: ["dashboard_stats"] as const,
};

/** Combine several UseQueryResults into a single isLoading/error/data view. */
function combine<T>(queries: UseQueryResult<any, any>[], compute: () => T): { data: T | undefined; isLoading: boolean; error: unknown } {
  const isLoading = queries.some(q => q.isLoading);
  const error = queries.find(q => q.error)?.error;
  const ready = queries.every(q => q.data !== undefined);
  return { data: ready ? compute() : undefined, isLoading, error };
}

export function useUsers() {
  return useQuery({ queryKey: keys.users, queryFn: fetchUsers });
}

export function useCustomers() {
  return useQuery({ queryKey: keys.customers, queryFn: fetchCustomers });
}

export function useProducts() {
  return useQuery({ queryKey: keys.products, queryFn: fetchProducts });
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: fetchSettings });
}

export function useDashboardStats() {
  return useQuery({ queryKey: keys.dashboardStats, queryFn: () => import("@/lib/api").then(m => m.fetchDashboardStats()) });
}

// Composed hooks below join raw rows with users/customers/products at the hook
// level (rather than inside the fetcher) so those lookups reuse whatever
// useUsers()/useCustomers()/useProducts() query is already cached instead of
// re-fetching them every time deals/movements/audit logs are requested.

export function useDeals(): { data: Deal[] | undefined; isLoading: boolean; error: unknown } {
  const usersQ = useUsers();
  const customersQ = useCustomers();
  const dealsQ = useQuery({ queryKey: keys.dealsRaw, queryFn: fetchDealsRaw });
  return combine([usersQ, customersQ, dealsQ], () =>
    dealsQ.data!.map(d => fromDeal(d, usersQ.data!, customersQ.data!))
  );
}

export function useDealsPaginated(page: number, pageSize: number, status?: string, q?: string): { data: { data: Deal[]; count: number } | undefined; isLoading: boolean; error: unknown } {
  const usersQ = useUsers();
  const customersQ = useCustomers();
  const dealsQ = useQuery({ queryKey: keys.dealsPaginated(page, pageSize, status, q), queryFn: () => fetchDealsPaginatedRaw(page, pageSize, status, q) });
  return combine([usersQ, customersQ, dealsQ], () => ({
    data: dealsQ.data!.data.map(d => fromDeal(d, usersQ.data!, customersQ.data!)),
    count: dealsQ.data!.count,
  }));
}

export function useInventoryMovements(): { data: InventoryMovement[] | undefined; isLoading: boolean; error: unknown } {
  const usersQ = useUsers();
  const productsQ = useProducts();
  const movQ = useQuery({ queryKey: keys.inventoryRaw, queryFn: fetchInventoryMovementsRaw });
  return combine([usersQ, productsQ, movQ], () =>
    movQ.data!.map(m => fromMovement(m, productsQ.data!, usersQ.data!))
  );
}

export function useInventoryMovementsPaginated(page: number, pageSize: number, q?: string): { data: { data: InventoryMovement[]; count: number } | undefined; isLoading: boolean; error: unknown } {
  const usersQ = useUsers();
  const productsQ = useProducts();
  const movQ = useQuery({ queryKey: keys.inventoryPaginated(page, pageSize, q), queryFn: () => fetchInventoryMovementsPaginatedRaw(page, pageSize, q) });
  return combine([usersQ, productsQ, movQ], () => ({
    data: movQ.data!.data.map(m => fromMovement(m, productsQ.data!, usersQ.data!)),
    count: movQ.data!.count,
  }));
}

export function useAuditLogs(): { data: import("@/lib/types").AuditEntry[] | undefined; isLoading: boolean; error: unknown } {
  const usersQ = useUsers();
  const auditQ = useQuery({ queryKey: keys.auditRaw, queryFn: fetchAuditLogsRaw });
  return combine([usersQ, auditQ], () =>
    auditQ.data!.map(a => fromAudit(a, usersQ.data!))
  );
}

export function useAuditLogsPaginated(page: number, pageSize: number, q?: string, actionFilter?: string, entityFilter?: string) {
  const usersQ = useUsers();
  const auditQ = useQuery({ queryKey: keys.auditPaginated(page, pageSize, q, actionFilter, entityFilter), queryFn: () => fetchAuditLogsPaginatedRaw(page, pageSize, q, actionFilter, entityFilter) });
  return combine([usersQ, auditQ], () => ({
    data: auditQ.data!.data.map(a => fromAudit(a, usersQ.data!)),
    count: auditQ.data!.count,
  }));
}

export function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

// --- Mutations ---
// All mutations invalidate the entire query cache on success, matching the
// previous refreshAll() behavior in src/lib/store.ts. This is cheap: it only
// marks queries stale, it doesn't refetch anything that isn't currently
// mounted/observed.

function useInvalidatingMutation<TVariables>(mutationFn: (vars: TVariables) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useUpsertUser() {
  const queryClient = useQueryClient();
  return useInvalidatingMutation<{ user: User; password?: string }>(async ({ user: u, password }) => {
    const existingUsers = queryClient.getQueryData<User[]>(keys.users);
    const exists = existingUsers?.some(x => x.id === u.id) ?? false;
    const { error } = exists
      ? await supabase.rpc("update_app_user", {
          p_user_id: u.id, p_email: u.email, p_password: password || null, p_name: u.name,
          p_role: u.role, p_phone: u.phone ?? null, p_department: null, p_active: u.active,
        })
      : await supabase.rpc("create_app_user", {
          p_email: u.email, p_password: password, p_name: u.name, p_role: u.role,
          p_phone: u.phone ?? null, p_department: null, p_active: u.active,
        });
    if (error) throw new Error(error.message);
  });
}

export function useDeleteUser() {
  return useInvalidatingMutation<string>(async (id) => {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}

export function useUpsertCustomer() {
  return useInvalidatingMutation<Customer>(async (c) => {
    const { error } = await supabase.from("customers").upsert(toCustomer(c));
    if (error) throw new Error(error.message);
  });
}

export function useArchiveCustomer() {
  return useInvalidatingMutation<string>(async (id) => {
    const { error } = await supabase.from("customers").update({ archived: true }).eq("id", id);
    if (error) throw new Error(error.message);
  });
}

export function useUpsertProduct() {
  return useInvalidatingMutation<Product>(async (p) => {
    const next = { ...p, updatedAt: nowIso() };
    const { error } = await supabase.from("products").upsert(toProduct(next));
    if (error) throw new Error(error.message);
  });
}

export function useArchiveProduct() {
  return useInvalidatingMutation<string>(async (id) => {
    const { error } = await supabase.from("products").update({ archived: true }).eq("id", id);
    if (error) throw new Error(error.message);
  });
}

export function useDeleteProduct() {
  return useInvalidatingMutation<string>(async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}

export function useAdjustInventory() {
  return useInvalidatingMutation<{ productId: string; quantityAfter: number; type: InventoryMovement["type"]; reason?: string }>(
    async ({ productId, quantityAfter, type, reason }) => {
      const { error } = await supabase.rpc("adjust_inventory", {
        p_product_id: productId,
        p_quantity_after: quantityAfter,
        p_movement_type: type,
        p_reason: reason || null,
      });
      if (error) throw new Error(error.message);
    }
  );
}

export function useCreateDeal() {
  return useInvalidatingMutation<{ deal: Deal; overrideStock?: boolean }>(async ({ deal, overrideStock = false }) => {
    const { error } = await supabase.rpc("create_deal_with_inventory", {
      p_deal: toDeal(deal), p_override_stock: overrideStock,
    });
    if (error) throw new Error(error.message);
  });
}

export function useUpdateDeal() {
  return useInvalidatingMutation<Deal>(async (d) => {
    const next = { ...d, updatedAt: nowIso() };
    const { error } = await supabase.from("deals").update(toDeal(next)).eq("id", d.id);
    if (error) throw new Error(error.message);
  });
}

export function useUpdateDealFull() {
  return useInvalidatingMutation<{ newDeal: Deal; overrideStock?: boolean }>(async ({ newDeal, overrideStock = false }) => {
    const next = { ...newDeal, updatedAt: nowIso() };
    const { error } = await supabase.rpc("update_deal_with_inventory", {
      p_deal: toDeal(next), p_override_stock: overrideStock,
    });
    if (error) throw new Error(error.message);
  });
}

export function useRequestEditDeal() {
  return useInvalidatingMutation<{ dealId: string; user: User }>(async ({ dealId, user }) => {
    const { error } = await supabase.rpc("request_deal_edit", {
      p_deal_id: dealId, p_requested_by: user.id, p_requested_by_name: user.name, p_requested_at: nowIso(),
    });
    if (error) throw new Error(error.message);
  });
}

export function useReviewEditRequest() {
  const queryClient = useQueryClient();
  return useInvalidatingMutation<{ dealId: string; approved: boolean; reviewer: User }>(async ({ dealId, approved, reviewer }) => {
    const dealRows = queryClient.getQueryData<DealRow[]>(keys.dealsRaw);
    const dealRow = dealRows?.find(d => d.id === dealId);
    const existing = dealRow?.edit_request as EditRequest | null | undefined;
    if (!existing) return;
    const editRequest: EditRequest = {
      ...existing, status: approved ? "approved" : "rejected",
      reviewedBy: reviewer.id, reviewedByName: reviewer.name, reviewedAt: nowIso(),
    };
    const { error } = await supabase.from("deals").update({ edit_request: editRequest, updated_at: nowIso() }).eq("id", dealId);
    if (error) throw new Error(error.message);
  });
}

export function useDeleteDeal() {
  return useInvalidatingMutation<string>(async (id) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}

export function useUpdateSettings() {
  return useInvalidatingMutation<{ companyName: string; defaultTax: number; currency: string; logoDataUrl?: string }>(async (s) => {
    const { error } = await supabase.from("company_settings").update({
      company_name: s.companyName, default_tax: s.defaultTax, currency: s.currency, logo_data_url: s.logoDataUrl ?? null,
    }).eq("id", true);
    if (error) throw new Error(error.message);
  });
}
