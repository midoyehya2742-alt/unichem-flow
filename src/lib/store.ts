import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type {
  AuditEntry,
  CompanySettings,
  Customer,
  Deal,
  InventoryMovement,
  Product,
  User,
} from "./types";

interface DB {
  users: User[];
  customers: Customer[];
  products: Product[];
  inventoryMovements: InventoryMovement[];
  deals: Deal[];
  audit: AuditEntry[];
  settings: CompanySettings;
}

const emptyDb = (): DB => ({
  users: [],
  customers: [],
  products: [],
  inventoryMovements: [],
  deals: [],
  audit: [],
  settings: { companyName: "UniChem ERP", defaultTax: 14, currency: "EGP" },
});

let db = emptyDb();

const emit = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("unichem-db-change"));
};

const uid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
};
const now = () => new Date().toISOString();

const fromProfile = (r: any): User => ({
  id: r.id,
  email: r.email || "",
  name: r.name,
  role: r.role || "salesman",
  phone: r.phone ?? undefined,
  active: r.active,
  createdAt: r.created_at,
});

const toProfile = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  phone: u.phone ?? null,
  active: u.active,
  created_at: u.createdAt,
});

const fromCustomer = (r: any): Customer => ({
  id: r.id,
  name: r.name,
  company: r.company ?? undefined,
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  address: r.address ?? undefined,
  taxId: r.tax_id ?? undefined,
  archived: r.archived,
  createdAt: r.created_at,
});

const toCustomer = (c: Customer) => ({
  id: c.id,
  name: c.name,
  company: c.company ?? null,
  phone: c.phone ?? null,
  email: c.email ?? null,
  address: c.address ?? null,
  tax_id: c.taxId ?? null,
  archived: c.archived,
  created_at: c.createdAt,
});

const fromProduct = (r: any): Product => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  category: r.category,
  unit: r.unit,
  stockQuantity: Number(r.stock_quantity || 0),
  minimumStockLevel: Number(r.minimum_stock_level || 0),
  defaultPrice: Number(r.default_price || 0),
  archived: r.archived,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toProduct = (p: Product) => ({
  id: p.id,
  sku: p.sku,
  name: p.name,
  category: p.category,
  unit: p.unit,
  stock_quantity: p.stockQuantity,
  minimum_stock_level: p.minimumStockLevel,
  default_price: p.defaultPrice,
  archived: p.archived,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
});

const fromDeal = (r: any, users: User[], customers: Customer[]): Deal => ({
  id: r.id,
  reference: r.reference,
  salesmanId: r.salesman_id,
  salesmanName: users.find(u => u.id === r.salesman_id)?.name || "Unknown",
  customerId: r.customer_id,
  customerName: customers.find(c => c.id === r.customer_id)?.name || "Unknown",
  lines: r.lines || [],
  subtotal: Number(r.subtotal || 0),
  discount: Number(r.discount || 0),
  tax: Number(r.tax || 0),
  total: Number(r.total || 0),
  currency: "EGP",
  paymentStatus: r.payment_status,
  amountPaid: Number(r.amount_paid || 0),
  dealStatus: r.deal_status,
  notes: r.notes ?? undefined,
  financeNotes: (r.finance_notes || []).map((n: any) => ({
    id: n.id, authorId: n.author_id, authorName: users.find(u => u.id === n.author_id)?.name || "Unknown",
    text: n.text, createdAt: n.created_at
  })),
  attachments: (r.deal_attachments || []).map((a: any) => ({
    id: a.id, name: a.name, size: a.size, type: a.mime, dataUrl: a.storage_path
  })),
  dealDate: r.deal_date,
  expectedPaymentDate: r.expected_payment_date ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toDeal = (d: Deal) => ({
  id: d.id,
  reference: d.reference,
  salesman_id: d.salesmanId,
  customer_id: d.customerId,
  lines: d.lines,
  subtotal: d.subtotal,
  discount: d.discount,
  tax: d.tax,
  total: d.total,
  currency: d.currency,
  payment_status: d.paymentStatus,
  amount_paid: d.amountPaid,
  deal_status: d.dealStatus,
  notes: d.notes ?? null,
  deal_date: d.dealDate,
  expected_payment_date: d.expectedPaymentDate ?? null,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
});

const fromMovement = (r: any, products: Product[], users: User[]): InventoryMovement => ({
  id: r.id,
  productId: r.product_id,
  productName: products.find(p => p.id === r.product_id)?.name || "Unknown",
  type: r.movement_type,
  quantityBefore: Number(r.quantity_before || 0),
  quantityAfter: Number(r.quantity_after || 0),
  quantityChanged: Number(r.quantity_changed || 0),
  reason: r.reason ?? undefined,
  dealId: r.deal_id ?? undefined,
  actorId: r.actor_id,
  actorName: users.find(u => u.id === r.actor_id)?.name || "Unknown",
  createdAt: r.created_at,
});

const fromAudit = (r: any, users: User[]): AuditEntry => ({
  id: r.id,
  actorId: r.actor_id,
  actorName: users.find(u => u.id === r.actor_id)?.name || "Unknown",
  action: r.action,
  entity: r.entity,
  entityId: r.entity_id,
  details: r.details ?? undefined,
  createdAt: r.created_at,
});

const fromSettings = (r: any): CompanySettings => ({
  companyName: r.company_name,
  defaultTax: Number(r.default_tax || 0),
  currency: "EGP",
  logoDataUrl: r.logo_data_url ?? undefined,
});

async function refreshAll() {
  const [usersRes, customersRes, productsRes, dealsRes, movementsRes, auditRes, settingsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("customers").select("*").order("name", { ascending: true }),
    supabase.from("products").select("*").order("name", { ascending: true }),
    supabase.from("deals").select("*, finance_notes(*), deal_attachments(*)").order("created_at", { ascending: false }),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("company_settings").select("*").limit(1),
  ]);

  const users = (usersRes.data || []).map(fromProfile);
  const customers = (customersRes.data || []).map(fromCustomer);
  const products = (productsRes.data || []).map(fromProduct);

  db = {
    users,
    customers,
    products,
    deals: (dealsRes.data || []).map(d => fromDeal(d, users, customers)),
    inventoryMovements: (movementsRes.data || []).map(m => fromMovement(m, products, users)),
    audit: (auditRes.data || []).map(a => fromAudit(a, users)),
    settings: settingsRes.data?.[0] ? fromSettings(settingsRes.data[0]) : db.settings,
  };
  emit();
}

async function refreshInventory() {
  const [productsRes, movementsRes] = await Promise.all([
    supabase.from("products").select("*").order("name", { ascending: true }),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }),
  ]);
  const products = (productsRes.data || []).map(fromProduct);
  db.products = products;
  db.inventoryMovements = (movementsRes.data || []).map(m => fromMovement(m, products, db.users));
  emit();
}

function remote(task: PromiseLike<unknown>) {
  Promise.resolve(task).catch((error) => {
    console.error(error);
  }).finally(() => {
    refreshAll().catch(console.error);
  });
}

// ensure hydration on boot if logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) refreshAll();
});
supabase.auth.onAuthStateChange((event, session) => {
  if (session) refreshAll();
});

export const store = {
  all: () => db,
  reset: () => {
    db = emptyDb();
    emit();
  },
  
  listUsers: () => db.users,
  upsertUser(u: User, password?: string): Promise<void> | undefined {
    const exists = db.users.some((x) => x.id === u.id);
    if (password && !exists) {
      // New user: don't optimistically add (server assigns the real UUID); return a
      // promise so the caller can await and surface any error to the user.
      return (async () => {
        const { error } = await supabase.rpc("create_app_user", {
          p_email: u.email,
          p_password: password,
          p_name: u.name,
          p_role: u.role,
          p_phone: u.phone ?? null,
          p_department: null,
          p_active: u.active,
        });
        if (error) throw new Error(error.message);
        await refreshAll();
      })();
    }
    db.users = exists ? db.users.map((x) => (x.id === u.id ? u : x)) : [...db.users, u];
    emit();
    remote((async () => {
      await supabase.from("profiles").upsert(toProfile(u));
      await supabase.from("user_roles").delete().eq("user_id", u.id);
      await supabase.from("user_roles").insert({ user_id: u.id, role: u.role });
    })());
  },
  deleteUser(id: string) {
    db.users = db.users.filter((u) => u.id !== id);
    emit();
    remote(supabase.from("profiles").delete().eq("id", id));
  },

  listCustomers: () => db.customers.filter((c) => !c.archived),
  upsertCustomer(c: Customer) {
    db.customers = db.customers.some((x) => x.id === c.id)
      ? db.customers.map((x) => (x.id === c.id ? c : x))
      : [...db.customers, c];
    emit();
    remote(supabase.from("customers").upsert(toCustomer(c)));
  },
  archiveCustomer(id: string) {
    db.customers = db.customers.map((c) => (c.id === id ? { ...c, archived: true } : c));
    emit();
    remote(supabase.from("customers").update({ archived: true }).eq("id", id));
  },

  listProducts: () => db.products.filter((p) => !p.archived),
  upsertProduct(p: Product) {
    const next = { ...p, updatedAt: now() };
    db.products = db.products.some((x) => x.id === next.id)
      ? db.products.map((x) => (x.id === next.id ? next : x))
      : [...db.products, next];
    emit();
    remote(supabase.from("products").upsert(toProduct(next)));
  },
  archiveProduct(id: string) {
    db.products = db.products.map((p) => (p.id === id ? { ...p, archived: true } : p));
    emit();
    remote(supabase.from("products").update({ archived: true }).eq("id", id));
  },
  deleteProduct(id: string) {
    db.products = db.products.filter((p) => p.id !== id);
    emit();
    remote(supabase.from("products").delete().eq("id", id));
  },

  listInventoryMovements: () => db.inventoryMovements.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  adjustInventory(productId: string, quantityAfter: number, actor: User, type: InventoryMovement["type"], reason?: string) {
    const p = db.products.find((x) => x.id === productId);
    if (!p) return;
    const before = p.stockQuantity;
    const after = Math.max(0, quantityAfter);
    db.products = db.products.map((x) => (x.id === productId ? { ...x, stockQuantity: after, updatedAt: now() } : x));
    
    // We add optimistic movement
    const movementId = uid();
    db.inventoryMovements = [{
      id: movementId,
      productId,
      productName: p.name,
      type,
      quantityBefore: before,
      quantityAfter: after,
      quantityChanged: after - before,
      reason,
      actorId: actor.id,
      actorName: actor.name,
      createdAt: now(),
    }, ...db.inventoryMovements];
    emit();

    remote((async () => {
      await supabase.from("inventory_movements").insert({
        id: movementId,
        product_id: productId,
        movement_type: type,
        quantity_before: before,
        quantity_after: after,
        quantity_changed: after - before,
        reason: reason || null,
        actor_id: actor.id,
        created_at: now()
      });
      await supabase.from("products").update({ stock_quantity: after, updated_at: now() }).eq("id", productId);
    })());
  },

  listDeals: () => db.deals.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getDeal: (id: string) => db.deals.find((d) => d.id === id),
  createDeal(d: Deal, overrideStock = false) {
    if (!overrideStock) {
      const short = d.lines.find((line) => {
        const p = db.products.find((x) => x.id === line.productId && !x.archived);
        return !p || p.stockQuantity < line.quantity;
      });
      if (short) throw new Error("Warning: Not enough inventory available.");
    }
    db.deals = [d, ...db.deals];
    d.lines.forEach((line) => {
      const p = db.products.find((x) => x.id === line.productId);
      if (!p) return;
      const after = Math.max(0, p.stockQuantity - line.quantity);
      db.products = db.products.map((x) => (x.id === p.id ? { ...x, stockQuantity: after, updatedAt: now() } : x));
    });
    emit();

    const doCreateDeal = async () => {
      await supabase.from("deals").insert(toDeal(d));
      // Deal attachments
      if (d.attachments.length > 0) {
        await supabase.from("deal_attachments").insert(
          d.attachments.map(a => ({
            id: a.id,
            deal_id: d.id,
            name: a.name,
            size: a.size,
            mime: a.type,
            storage_path: a.dataUrl, // in a real app, upload to storage and store path
            uploaded_by: d.salesmanId,
          }))
        );
      }
      
      // Update inventory based on deal
      const movements = d.lines.map(line => {
        const p = db.products.find((x) => x.id === line.productId);
        const before = p?.stockQuantity || 0;
        return {
          product_id: line.productId,
          movement_type: overrideStock ? "override-sale" : "sale",
          quantity_before: before,
          quantity_after: Math.max(0, before - line.quantity),
          quantity_changed: -line.quantity,
          deal_id: d.id,
          actor_id: d.salesmanId,
        };
      });
      
      for (const m of movements) {
        await supabase.from("inventory_movements").insert(m);
        await supabase.from("products").update({ stock_quantity: m.quantity_after }).eq("id", m.product_id);
      }
    };
    remote(doCreateDeal());
  },
  updateDeal(d: Deal, actor: User) {
    const prev = db.deals.find(x => x.id === d.id);
    const next = { ...d, updatedAt: now() };
    db.deals = db.deals.map((x) => (x.id === d.id ? next : x));
    emit();

    const doUpdateDeal = async () => {
      await supabase.from("deals").update(toDeal(next)).eq("id", d.id);
      
      // Handle new finance notes
      if (prev) {
        const newNotes = d.financeNotes.filter(n => !prev.financeNotes.find(pn => pn.id === n.id));
        if (newNotes.length > 0) {
          await supabase.from("finance_notes").insert(
            newNotes.map(n => ({
              id: n.id,
              deal_id: d.id,
              author_id: n.authorId,
              text: n.text,
              created_at: n.createdAt
            }))
          );
        }
      }
    };
    remote(doUpdateDeal());
  },

  listAudit: () => db.audit.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getSettings: () => db.settings,
  updateSettings(s: CompanySettings) {
    db.settings = s;
    emit();
    remote(supabase.from("company_settings").update({
      company_name: s.companyName,
      default_tax: s.defaultTax,
      currency: s.currency,
      logo_data_url: s.logoDataUrl ?? null,
    }).eq("id", true));
  },
};

export const newId = uid;
export const nowIso = now;

export function nextRef(prefix = "DL") {
  const n = db.deals.length + 1;
  const yy = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${yy}-${String(n).padStart(4, "0")}`;
}

export function useDb() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener("unichem-db-change", h);
    return () => window.removeEventListener("unichem-db-change", h);
  }, []);
  return store;
}
