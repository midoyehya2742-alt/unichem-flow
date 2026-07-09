import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { newId, nowIso } from "@/lib/store";
import { useProducts, useUpsertProduct, useArchiveProduct } from "@/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Archive, Pencil, Search, Box, PackageOpen } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { formatEGP, formatCompactEGP } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from "@/components/ui/glow-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { motion } from "framer-motion";
import { Package, AlertTriangle, TrendingUp } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, ComposedChart, Line, Legend } from "recharts";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><ProductsPage /></RequireAuth>,
});

function ProductsPage() {
  const { data: products, isLoading: loading } = useProducts();
  const upsertProduct = useUpsertProduct();
  const archiveProduct = useArchiveProduct();
  const { t } = useTranslation("common");
  const list = useMemo(() => (products ?? []).filter(p => !p.archived), [products]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setPage(1);
  }, [q]);

  const filtered = useMemo(
    () => list.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const totalProducts = list.length;
  const avgPrice = list.length > 0 ? list.reduce((sum, p) => sum + p.defaultPrice, 0) / list.length : 0;
  const lowStockCount = list.filter(p => p.stockQuantity <= p.minimumStockLevel).length;

  const categoryAnalytics = useMemo(() => {
    const analytics: Record<string, {
      name: string;
      productCount: number;
      totalValue: number;
      totalStock: number;
      avgPrice: number;
      lowStock: number;
      outOfStock: number;
      healthyStock: number;
    }> = {};

    list.forEach(p => {
      if (!analytics[p.category]) {
        analytics[p.category] = {
          name: p.category,
          productCount: 0,
          totalValue: 0,
          totalStock: 0,
          avgPrice: 0,
          lowStock: 0,
          outOfStock: 0,
          healthyStock: 0,
        };
      }
      const a = analytics[p.category];
      a.productCount += 1;
      a.totalStock += p.stockQuantity;
      a.totalValue += (p.stockQuantity * p.defaultPrice);
      if (p.stockQuantity === 0) {
        a.outOfStock += 1;
      } else if (p.stockQuantity <= p.minimumStockLevel) {
        a.lowStock += 1;
      } else {
        a.healthyStock += 1;
      }
    });

    return Object.values(analytics).map(a => {
      a.avgPrice = a.productCount > 0 ? (list.filter(p => p.category === a.name).reduce((sum, p) => sum + p.defaultPrice, 0) / a.productCount) : 0;
      return a;
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [list]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

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
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("products.title")}
        description={t("products.desc")}
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs shadow-md shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"><Plus className="h-4 w-4 me-2 rtl:ml-2 rtl:mr-0" />{t("products.new_product")}</Button>}
      />
      {/* KPI Row */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid gap-4 grid-cols-1 sm:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Package}
            label={t("products.total_products", { defaultValue: "Total Products" })}
            value={totalProducts.toString()}
            numericValue={totalProducts}
            formatter={(v) => Math.round(v).toString()}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={TrendingUp}
            label={t("products.average_price", { defaultValue: "Average Price" })}
            value={formatCompactEGP(avgPrice)}
            numericValue={avgPrice}
            formatter={(v) => formatCompactEGP(v)}
            tone="success"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={AlertTriangle}
            label={t("products.low_stock", { defaultValue: "Low Stock Alerts" })}
            value={lowStockCount.toString()}
            numericValue={lowStockCount}
            formatter={(v) => Math.round(v).toString()}
            tone={lowStockCount > 0 ? "danger" : "success"}
          />
        </motion.div>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Category Valuation Chart - wider */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden h-full">
            <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
              <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("products.category_valuation_volume", { defaultValue: "Category Valuation & Volume" })}</GlowCardTitle>
            </GlowCardHeader>
            <GlowCardContent className="p-4 h-72">
              {categoryAnalytics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
              ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={categoryAnalytics} margin={{ top: 10, right: 15, bottom: 10, left: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-slate-400 font-medium" />
                        <YAxis yAxisId="left" tickFormatter={(v) => formatCompactEGP(v)} className="text-[10px]" label={{ value: t("products.valuation_egp", { defaultValue: "Valuation (EGP)" }), angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#6366f1" } }} />
                        <YAxis yAxisId="right" orientation="right" className="text-[10px]" label={{ value: t("products.stock_units", { defaultValue: "Stock (Units)" }), angle: 90, position: "insideRight", style: { fontSize: 10, fill: "#10b981" } }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs space-y-1.5">
                                  <p className="font-bold text-slate-900 dark:text-white">{data.name}</p>
                                  <p className="text-indigo-500 font-medium">{t("products.valuation", { defaultValue: "Valuation" })}: {formatCompactEGP(data.totalValue)}</p>
                                  <p className="text-emerald-500 font-medium">{t("products.stock", { defaultValue: "Stock" })}: {data.totalStock} {t("products.units", { defaultValue: "units" })}</p>
                                  <p className="text-slate-500">{t("products.products_title", { defaultValue: "Products" })}: {data.productCount}</p>
                                  <p className="text-slate-500">{t("products.avg_price_label", { defaultValue: "Avg. Price" })}: {formatCompactEGP(data.avgPrice)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="totalValue" name={t("products.total_value_egp", { defaultValue: "Total Value (EGP)" })} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={25} />
                        <Line yAxisId="right" type="monotone" dataKey="totalStock" name={t("products.total_stock_units", { defaultValue: "Total Stock (Units)" })} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
              )}
            </GlowCardContent>
          </GlowCard>
        </motion.div>

        {/* Product Catalog Share Donut Chart - narrower */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden h-full">
            <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
              <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("products.catalog_share", { defaultValue: "Product Catalog Share" })}</GlowCardTitle>
            </GlowCardHeader>
            <GlowCardContent className="p-4 h-72 relative flex items-center justify-center">
              {categoryAnalytics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
              ) : (
                <>
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryAnalytics}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="productCount"
                          nameKey="name"
                        >
                          {categoryAnalytics.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const percent = ((data.productCount / totalProducts) * 100).toFixed(1);
                              return (
                                <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs space-y-0.5">
                                  <p className="font-bold text-slate-900 dark:text-white">{data.name}</p>
                                  <p className="text-indigo-500 font-medium">Products: {data.productCount} ({percent}%)</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">{totalProducts}</span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t("products.total_items", { defaultValue: "Total Items" })}</p>
                  </div>
                </>
              )}
            </GlowCardContent>
          </GlowCard>
        </motion.div>
      </motion.div>

      {/* Full-Width Product Catalog Table */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
          <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("products.catalog_title", { defaultValue: "Product Catalog" })}</GlowCardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                className="ps-9 h-9 text-xs focus-visible:ring-indigo-500 placeholder-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" 
                placeholder={t("products.search")} 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
              />
            </div>
          </GlowCardHeader>
          
          <GlowCardContent className="p-0">
            {loading ? (
              <div className="p-4"><TableSkeleton columns={7} rows={8} /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
                  <PackageOpen className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("products.no_products_found")}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {q ? t("products.no_search_results") : t("products.empty_catalog")}
                </p>
                {!q && (
                  <Button size="sm" onClick={openNew} className="mt-4 shadow-sm shadow-indigo-600/10">
                    <Plus className="h-4 w-4 me-2" /> {t("products.add_first")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-px">
                <table className="w-full min-w-[720px] text-xs text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-5 py-3 text-start">{t("products.sku")}</th>
                      <th className="px-5 py-3 text-start">{t("products.name")}</th>
                      <th className="px-5 py-3 text-start">{t("products.category")}</th>
                      <th className="px-5 py-3 text-start">{t("products.unit")}</th>
                      <th className="px-5 py-3 text-end">{t("products.stock_qty", { defaultValue: "Stock" })}</th>
                      <th className="px-5 py-3 text-end">{t("products.default_price")}</th>
                      <th className="px-5 py-3 text-end w-32">{t("products.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {paginated.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                        <td className="px-5 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{p.sku}</td>
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.name}</td>
                        <td className="px-5 py-3 text-slate-500">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium">{p.category}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{p.unit}</td>
                        <td className="px-5 py-3 text-end">
                          {p.stockQuantity <= p.minimumStockLevel ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <AlertTriangle className="h-3 w-3" />
                              {p.stockQuantity}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-700 dark:text-slate-300">{p.stockQuantity}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-end font-bold text-slate-900 dark:text-white">{formatEGP(p.defaultPrice)}</td>
                        <td className="px-5 py-3 text-end">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><Pencil className="h-3.5 w-3.5" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("products.archive_confirm_title", { defaultValue: "Archive Product?" })}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("products.archive_confirm_desc", { defaultValue: "This product will be archived and will no longer appear in active catalog searches. Current inventory logs will be preserved." })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.actions.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => { archiveProduct.mutate(p.id, { onSuccess: () => toast.success(t("products.archived")) }); }} className="bg-rose-500 hover:bg-rose-600 text-white">
                                    {t("products.actions.archive", { defaultValue: "Archive" })}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800/50">
                <div className="text-xs text-slate-500">
                  {t("common.showing", { defaultValue: "Showing" })} {paginated.length} {t("common.of", { defaultValue: "of" })} {filtered.length} {t("products.catalog_title", { defaultValue: "Products" })}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs border-slate-200 dark:border-slate-700"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t("common.previous", { defaultValue: "Previous" })}
                  </Button>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs border-slate-200 dark:border-slate-700"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {t("common.next", { defaultValue: "Next" })}
                  </Button>
                </div>
              </div>
            )}
          </GlowCardContent>
        </GlowCard>
      </motion.div>

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
                {(products ?? []).some((p) => p.id === editing.id) ? (
                  <Field label={t("products.stock_qty")}>
                    <Input type="number" value={editing.stockQuantity} disabled className="h-9 bg-slate-100 dark:bg-slate-800" />
                    <p className="text-[10px] text-slate-400 mt-1">{t("inventory.adjust_via_ledger", { defaultValue: "Adjust quantity from Inventory to keep an audit trail." })}</p>
                  </Field>
                ) : (
                  <Field label={t("products.stock_qty")}><Input type="number" min={0} step="0.01" value={editing.stockQuantity === 0 ? "" : editing.stockQuantity} onChange={(e) => setEditing({ ...editing, stockQuantity: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
                )}
                <Field label={t("products.min_threshold")}><Input type="number" min={0} step="0.01" value={editing.minimumStockLevel === 0 ? "" : editing.minimumStockLevel} onChange={(e) => setEditing({ ...editing, minimumStockLevel: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
              </div>
              <Field label={t("products.price_egp")}><Input type="number" min={0} step="0.01" value={editing.defaultPrice === 0 ? "" : editing.defaultPrice} onChange={(e) => setEditing({ ...editing, defaultPrice: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.actions.cancel")}</Button>
              <Button size="sm" onClick={() => {
                if (!editing.name.trim() || !editing.sku.trim()) return toast.error(t("products.err_name_sku"));
                upsertProduct.mutate(editing, {
                  onSuccess: () => { toast.success(t("products.saved")); setOpen(false); },
                });
              }}>{t("products.save_product")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageTransition>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-slate-500">{label}</Label>{children}</div>;
}
