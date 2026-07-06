export type Role = "admin" | "finance" | "salesman";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  archived: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stockQuantity: number;
  minimumStockLevel: number;
  defaultPrice: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InventoryAdjustmentType = "increase" | "decrease" | "correction" | "sale" | "override-sale";

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: InventoryAdjustmentType;
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  reason?: string;
  dealId?: string;
  dealReference?: string;
  actorId: string;
  actorName: string;
  createdAt: string;
}

export type PaymentStatus = "unpaid" | "partial" | "paid";
export type DealStatus = "pending" | "approved" | "rejected" | "delivered";

export interface EditRequest {
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

export interface DealLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percent
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  path?: string; // storage object path in the "deal-attachments" bucket
  dataUrl?: string; // legacy: base64 data URL (older deals stored inline)
}

export interface FinanceNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  reference: string;
  salesmanId: string;
  salesmanName: string;
  customerId: string;
  customerName: string;
  lines: DealLine[];
  subtotal: number;
  discount: number; // total %
  tax: number; // %
  total: number;
  currency: "EGP";
  paymentStatus: PaymentStatus;
  amountPaid: number;
  dealStatus: DealStatus;
  notes?: string;
  financeNotes: FinanceNote[];
  attachments: Attachment[];
  paymentType?: "immediate" | "installments";
  paymentMethod?: "cash" | "cheques";
  paymentInfo?: string;
  immediateAmount?: number;
  cheques?: { id: string; amount: number; dueDate: string }[];
  dealDate: string;
  expectedPaymentDate?: string;
  createdAt: string;
  updatedAt: string;
  editRequest?: EditRequest;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  // Stored as jsonb: either a { message } string note, an { old, new } diff
  // produced by the DB audit trigger, or null.
  details?: { message: string } | { old?: Record<string, unknown>; new?: Record<string, unknown> } | Record<string, unknown>;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  defaultTax: number;
  currency: "EGP";
  logoDataUrl?: string;
}
