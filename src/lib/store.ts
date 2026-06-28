/**
 * Frontend-only mock data store backed by localStorage.
 * Replace every function in this file with Supabase queries when wiring backend.
 * See README.md "Backend Integration" for the exact mapping.
 */
import type {
  AuditEntry,
  CompanySettings,
  Customer,
  Deal,
  Product,
  User,
} from "./types";

const KEY = "unichem.db.v1";

interface DB {
  users: User[];
  customers: Customer[];
  products: Product[];
  deals: Deal[];
  audit: AuditEntry[];
  settings: CompanySettings;
  passwords: Record<string, string>; // email -> password (MOCK ONLY)
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const seed = (): DB => {
  const adminId = uid();
  const financeId = uid();
  const salesId = uid();
  return {
    users: [
      { id: adminId, email: "midoyehya2742@gmail.com", name: "Mido (Admin)", role: "admin", active: true, createdAt: now() },
      { id: financeId, email: "finance@unichem.local", name: "Finance Lead", role: "finance", active: true, createdAt: now() },
      { id: salesId, email: "sales@unichem.local", name: "Ahmed Sales", role: "salesman", active: true, createdAt: now() },
    ],
    passwords: {
      "midoyehya2742@gmail.com": "memo2742",
      "finance@unichem.local": "finance123",
      "sales@unichem.local": "sales123",
    },
    customers: [
      { id: uid(), name: "Cairo Pharma Co.", company: "Cairo Pharma", phone: "+20 100 111 2222", email: "buyer@cairopharma.eg", address: "Nasr City, Cairo", archived: false, createdAt: now() },
      { id: uid(), name: "Alex Industrial", company: "Alex Industrial Group", phone: "+20 122 333 4444", email: "ops@alexind.eg", address: "Smouha, Alexandria", archived: false, createdAt: now() },
      { id: uid(), name: "Delta Labs", company: "Delta Labs", phone: "+20 111 555 6666", email: "info@deltalabs.eg", address: "Mansoura", archived: false, createdAt: now() },
    ],
    products: [
      { id: uid(), sku: "CHM-001", name: "Acetic Acid 99%", unit: "L", defaultPrice: 85, archived: false, createdAt: now() },
      { id: uid(), sku: "CHM-002", name: "Sodium Hydroxide", unit: "kg", defaultPrice: 42, archived: false, createdAt: now() },
      { id: uid(), sku: "CHM-003", name: "Isopropyl Alcohol", unit: "L", defaultPrice: 120, archived: false, createdAt: now() },
      { id: uid(), sku: "CHM-004", name: "Hydrogen Peroxide 30%", unit: "L", defaultPrice: 95, archived: false, createdAt: now() },
    ],
    deals: [],
    audit: [],
    settings: {
      companyName: "UniChem",
      defaultTax: 14,
      currency: "EGP",
    },
  };
};

function read(): DB {
  if (typeof window === "undefined") return seed();
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const fresh = seed();
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  }
  try { return JSON.parse(raw) as DB; } catch { return seed(); }
}

function write(db: DB) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new Event("unichem-db-change"));
}

export const store = {
  all: () => read(),
  reset: () => write(seed()),

  // auth
  verifyLogin(email: string, password: string): User | null {
    const db = read();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
    if (!user) return null;
    if (db.passwords[user.email] !== password) return null;
    return user;
  },

  // users
  listUsers: () => read().users,
  upsertUser(u: User, password?: string) {
    const db = read();
    const i = db.users.findIndex((x) => x.id === u.id);
    if (i >= 0) db.users[i] = u; else db.users.push(u);
    if (password) db.passwords[u.email] = password;
    write(db);
  },
  deleteUser(id: string) {
    const db = read();
    db.users = db.users.filter((u) => u.id !== id);
    write(db);
  },

  // customers
  listCustomers: () => read().customers.filter((c) => !c.archived),
  upsertCustomer(c: Customer) {
    const db = read();
    const i = db.customers.findIndex((x) => x.id === c.id);
    if (i >= 0) db.customers[i] = c; else db.customers.push(c);
    write(db);
  },
  archiveCustomer(id: string) {
    const db = read();
    const c = db.customers.find((x) => x.id === id);
    if (c) c.archived = true;
    write(db);
  },

  // products
  listProducts: () => read().products.filter((p) => !p.archived),
  upsertProduct(p: Product) {
    const db = read();
    const i = db.products.findIndex((x) => x.id === p.id);
    if (i >= 0) db.products[i] = p; else db.products.push(p);
    write(db);
  },
  archiveProduct(id: string) {
    const db = read();
    const p = db.products.find((x) => x.id === id);
    if (p) p.archived = true;
    write(db);
  },

  // deals
  listDeals: () => read().deals.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getDeal: (id: string) => read().deals.find((d) => d.id === id),
  createDeal(d: Deal) {
    const db = read();
    db.deals.push(d);
    db.audit.push({
      id: uid(), actorId: d.salesmanId, actorName: d.salesmanName,
      action: "create", entity: "deal", entityId: d.id,
      details: `Created deal ${d.reference} for ${d.customerName} — ${d.total} EGP`,
      createdAt: now(),
    });
    write(db);
  },
  updateDeal(d: Deal, actor: User) {
    const db = read();
    const i = db.deals.findIndex((x) => x.id === d.id);
    if (i < 0) return;
    db.deals[i] = { ...d, updatedAt: now() };
    db.audit.push({
      id: uid(), actorId: actor.id, actorName: actor.name,
      action: "update", entity: "deal", entityId: d.id,
      details: `Updated deal ${d.reference}`,
      createdAt: now(),
    });
    write(db);
  },

  // audit
  listAudit: () => read().audit.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  // settings
  getSettings: () => read().settings,
  updateSettings(s: CompanySettings) {
    const db = read();
    db.settings = s;
    write(db);
  },
};

export const newId = uid;
export const nowIso = now;

export function nextRef(prefix = "DL") {
  const db = read();
  const n = db.deals.length + 1;
  const yy = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${yy}-${String(n).padStart(4, "0")}`;
}

import { useEffect, useState } from "react";
export function useDb() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener("unichem-db-change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("unichem-db-change", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return store;
}
