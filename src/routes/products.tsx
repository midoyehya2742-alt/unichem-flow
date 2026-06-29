import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Archive, Pencil, Search, Box, PackageOpen } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { formatEGP } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><ProductsPage /></RequireAuth>,
});

function ProductsPage() {
  const db = useDb();
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(true);
  const list = db.listProducts();
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(
    () => list.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({
      id: newId(),
      sku: "",
      name: "",
      category: "General",
      unit: "KG",
      stockQuantity: 0,
      minimumStockLevel: 0,
      defaultPrice: 0,
      archived: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    setOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("products.title")}
        description={t("products.desc")}
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs"><Plus className="h-4 w-4 me-2 rtl:ml-2 rtl:mr-0" />{t("products.new_product")}</Button>}
      />

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 relative">
          <Search className="h-4 w-4 absolute start-7 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="ps-9 h-10 text-xs focus-visible:ring-indigo-500 placeholder-slate-455" placeholder={t("products.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <div className="p-6 space-y-4">
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
              <PackageOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("products.no_products_found")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {q ? t("products.no_search_results") : t("products.empty_catalog")}
            </p>
            {!q && (
              <Button size="sm" onClick={openNew} className="mt-4">
                <Plus className="h-4 w-4 me-2" /> {t("products.add_first")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr className="text-start font-semibold">
                  <th className="px-5 py-3.5 text-start">{t("products.sku")}</th>
                  <th className="px-5 py-3.5 text-start">{t("products.name")}</th>
                  <th className="px-5 py-3.5 text-start">{t("products.category")}</th>
                  <th className="px-5 py-3.5 text-start">{t("products.unit")}</th>
                  <th className="px-5 py-3.5 text-end">{t("products.default_price")}</th>
                  <th className="px-5 py-3.5 text-end w-32">{t("products.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{p.sku}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{p.category}</td>
                    <td className="px-5 py-3.5 text-slate-500">{p.unit}</td>
                    <td className="px-5 py-3.5 text-end font-semibold text-slate-900 dark:text-white">{formatEGP(p.defaultPrice)}</td>
                    <td className="px-5 py-3.5 text-end">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { db.archiveProduct(p.id); toast.success(t("products.archived")); }} className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {editing && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md font-sans dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">{editing.name ? t("products.edit_title") : t("products.create_title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("products.sku_req")}><Input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} className="h-9" /></Field>
                <Field label={t("products.name_req")}><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-9" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("products.category_label")}><Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="h-9" /></Field>
                <Field label={t("products.packing_unit")}><Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} className="h-9" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("products.stock_qty")}><Input type="number" min={0} step="0.01" value={editing.stockQuantity} onChange={(e) => setEditing({ ...editing, stockQuantity: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
                <Field label={t("products.min_threshold")}><Input type="number" min={0} step="0.01" value={editing.minimumStockLevel} onChange={(e) => setEditing({ ...editing, minimumStockLevel: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
              </div>
              <Field label={t("products.price_egp")}><Input type="number" min={0} step="0.01" value={editing.defaultPrice} onChange={(e) => setEditing({ ...editing, defaultPrice: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.actions.cancel")}</Button>
              <Button size="sm" onClick={() => {
                if (!editing.name.trim() || !editing.sku.trim()) return toast.error(t("products.err_name_sku"));
                db.upsertProduct(editing);
                toast.success(t("products.saved"));
                setOpen(false);
              }}>{t("products.save_product")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-slate-500">{label}</Label>{children}</div>;
}
