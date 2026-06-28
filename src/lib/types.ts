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
  unit: string;
  defaultPrice: number;
  archived: boolean;
  createdAt: string;
}

export type PaymentStatus = "unpaid" | "partial" | "paid";
export type DealStatus = "pending" | "approved" | "rejected" | "delivered";

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
  dataUrl: string; // base64 (mock)
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
  dealDate: string;
  expectedPaymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  defaultTax: number;
  currency: "EGP";
  logoDataUrl?: string;
}
