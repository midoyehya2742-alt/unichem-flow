import { supabase } from "./supabase";
import type { Database } from "@/integrations/supabase/types";
import type {
  Attachment,
  AuditEntry,
  CompanySettings,
  Customer,
  Deal,
  InventoryMovement,
  Product,
  User,
} from "./types";

const ATTACHMENTS_BUCKET = "deal-attachments";

/** A file the user has staged for upload but not yet sent to Storage. */
export interface PendingAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

// Storage object keys must avoid spaces / unusual characters.
const safeKey = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, "_");

const uid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
};
const now = () => new Date().toISOString();

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type InventoryMovementRow = Database["public"]["Tables"]["inventory_movements"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type CompanySettingsRow = Database["public"]["Tables"]["company_settings"]["Row"];

export const fromProfile = (r: ProfileRow): User => ({
  id: r.id,
  email: r.email || "",
  name: r.name,
  role: r.role as User["role"] || "salesman",
  phone: r.phone ?? undefined,
  active: r.active ?? true,
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

export const fromCustomer = (r: CustomerRow): Customer => ({
  id: r.id,
  name: r.name,
  company: r.company ?? undefined,
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  address: r.address ?? undefined,
  taxId: r.tax_id ?? undefined,
  archived: r.archived ?? false,
  createdAt: r.created_at,
});

export const toCustomer = (c: Customer) => ({
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

export const fromProduct = (r: ProductRow): Product => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  category: r.category,
  unit: r.unit,
  stockQuantity: Number(r.stock_quantity || 0),
  minimumStockLevel: Number(r.minimum_stock_level || 0),
  defaultPrice: Number(r.default_price || 0),
  archived: r.archived ?? false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toProduct = (p: Product) => ({
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

export const fromDeal = (r: DealRow, users: User[], customers: Customer[]): Deal => ({
  id: r.id,
  reference: r.reference,
  salesmanId: r.salesman_id,
  salesmanName: r.salesman_name || users.find(u => u.id === r.salesman_id)?.name || "Unknown",
  customerId: r.customer_id,
  customerName: r.customer_name || customers.find(c => c.id === r.customer_id)?.name || "Unknown",
  lines: (r.lines as any[]) || [],
  subtotal: Number(r.subtotal || 0),
  discount: Number(r.discount || 0),
  tax: Number(r.tax || 0),
  total: Number(r.total || 0),
  currency: "EGP",
  paymentStatus: r.payment_status as Deal["paymentStatus"],
  amountPaid: Number(r.amount_paid || 0),
  dealStatus: r.deal_status as Deal["dealStatus"],
  notes: r.notes ?? undefined,
  financeNotes: ((r.finance_notes as any[]) || []).map((n: any) => ({
    id: n.id,
    authorId: n.authorId ?? n.author_id,
    authorName: n.authorName ?? users.find(u => u.id === (n.authorId ?? n.author_id))?.name ?? "Unknown",
    text: n.text,
    createdAt: n.createdAt ?? n.created_at,
  })),
  attachments: ((r.attachments as any[]) || []).map((a: any) => ({
    id: a.id, name: a.name, size: a.size, type: a.type ?? a.mime,
    path: a.path ?? undefined, dataUrl: a.dataUrl ?? undefined,
  })),
  paymentType: (r.payment_type as Deal["paymentType"]) ?? undefined,
  paymentMethod: r.payment_method ?? undefined,
  paymentInfo: r.payment_info ?? undefined,
  immediateAmount: r.immediate_amount ? Number(r.immediate_amount) : undefined,
  cheques: (r.cheques as Deal["cheques"]) ?? undefined,
  dealDate: r.deal_date,
  expectedPaymentDate: r.expected_payment_date ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  editRequest: (r.edit_request as Deal["editRequest"]) ?? undefined,
});

export const toDeal = (d: Deal) => ({
  id: d.id,
  reference: d.reference,
  salesman_id: d.salesmanId,
  salesman_name: d.salesmanName,
  customer_id: d.customerId,
  customer_name: d.customerName,
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
  finance_notes: d.financeNotes,
  attachments: d.attachments,
  payment_type: d.paymentType ?? null,
  payment_method: d.paymentMethod ?? null,
  payment_info: d.paymentInfo ?? null,
  immediate_amount: d.immediateAmount ?? null,
  cheques: d.cheques ?? null,
  deal_date: d.dealDate,
  expected_payment_date: d.expectedPaymentDate ?? null,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
  edit_request: d.editRequest ?? null,
});

export const fromMovement = (r: InventoryMovementRow, products: Product[], users: User[]): InventoryMovement => ({
  id: r.id,
  productId: r.product_id,
  productName: products.find(p => p.id === r.product_id)?.name || "Unknown",
  type: r.movement_type as InventoryMovement["type"],
  quantityBefore: Number(r.quantity_before || 0),
  quantityAfter: Number(r.quantity_after || 0),
  quantityChanged: Number(r.quantity_changed || 0),
  reason: r.reason ?? undefined,
  dealId: r.deal_id ?? undefined,
  actorId: r.actor_id || "",
  actorName: users.find(u => u.id === r.actor_id)?.name || "Unknown",
  createdAt: r.created_at,
});

export const fromAudit = (r: AuditLogRow, users: User[]): AuditEntry => ({
  id: r.id,
  actorId: r.actor_id || "",
  actorName: users.find(u => u.id === r.actor_id)?.name || "Unknown",
  action: r.action,
  entity: r.entity,
  entityId: r.entity_id || "",
  details: (r.details as AuditEntry["details"]) ?? undefined,
  createdAt: r.created_at,
});

export const fromSettings = (r: CompanySettingsRow): CompanySettings => ({
  companyName: r.company_name,
  defaultTax: Number(r.default_tax || 0),
  currency: "EGP",
  logoDataUrl: r.logo_data_url ?? undefined,
});

export async function uploadDealFiles(dealId: string, files: PendingAttachment[]): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files) {
    const path = `deals/${dealId}/${f.id}-${safeKey(f.name)}`;
    const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, f.file, { contentType: f.type, upsert: false });
    if (error) throw new Error(`${f.name}: ${error.message}`);
    out.push({ id: f.id, name: f.name, size: f.size, type: f.type, path });
  }
  return out;
}

export async function getAttachmentUrl(att: Attachment): Promise<string | null> {
  if (att.path) {
    const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(att.path, 3600);
    if (error) return null;
    return data?.signedUrl ?? null;
  }
  return att.dataUrl ?? null;
}

export const newId = uid;
export const nowIso = now;

export function nextRef(prefix = "DL") {
  const yy = new Date().getFullYear().toString().slice(-2);
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${yy}-${randomStr}`;
}
