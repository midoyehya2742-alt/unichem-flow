import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackagePlus, Pencil, Trash2, Search, Download, Printer, Plus, Minus, RefreshCw, PackageOpen } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDateTime, formatNumber, formatCompactEGP } from "@/lib/format";
import type { InventoryAdjustmentType, Product, User, InventoryMovement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { PageTransition } from "@/components/ui/page-transition";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, AreaChart, Area, Legend } from "recharts";
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from "@/components/ui/glow-card";
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
import { KpiCard } from "@/components/ui/kpi-card";
import { motion } from "framer-motion";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";


export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory - UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance", "salesman"]}><InventoryPage /></RequireAuth>,
});

const units = ["KG", "Ton", "Bag", "Drum", "L", "Box", "Piece"];

function InventoryPage() {
  const { user } = useAuth();
  const db = useDb();
  const { t, i18n } = useTranslation("common");
  const [loading, setLoading] = useState(true);
  const products = db.listProducts();
  const movements = db.listInventoryMovements();
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [lowOnly, setLowOnly] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => {
    const tId = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(tId);
  }, []);

  const filtered = useMemo(() => products.filter((p) => {
    const low = p.stockQuantity <= p.minimumStockLevel;
    if (category !== "all" && p.category !== category) return false;
    if (lowOnly === "low" && !low) return false;
    if (!query) return true;
    const text = `${p.name} ${p.category} ${p.sku}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [products, query, category, lowOnly]);

  const lowCount = products.filter((p) => p.stockQuantity <= p.minimumStockLevel).length;
  const totalStock = products.reduce((acc, p) => acc + p.stockQuantity, 0);
  const totalStockValue = products.reduce((acc, p) => acc + p.stockQuantity * p.defaultPrice, 0);

  const movementHistoryData = useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    const dailyData = dates.reduce((acc, date) => {
      acc[date] = { date, inward: 0, outward: 0 };
      return acc;
    }, {} as Record<string, { date: string; inward: number; outward: number }>);

    movements.forEach(m => {
      const date = m.createdAt.split("T")[0];
      if (dailyData[date]) {
        const qty = Math.abs(m.quantityChanged);
        if (m.type === "increase" || (m.type === "correction" && m.quantityChanged > 0)) {
          dailyData[date].inward += qty;
        } else {
          dailyData[date].outward += qty;
        }
      }
    });

    return Object.values(dailyData).map(d => {
      const dateObj = new Date(d.date);
      const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        ...d,
        label
      };
    });
  }, [movements]);

  const categoryStockData = useMemo(() => {
    const stats: Record<string, { name: string; current: number; minimum: number }> = {};
    products.forEach(p => {
      if (!stats[p.category]) {
        stats[p.category] = { name: p.category, current: 0, minimum: 0 };
      }
      stats[p.category].current += p.stockQuantity;
      stats[p.category].minimum += p.minimumStockLevel;
    });
    return Object.values(stats).sort((a, b) => b.current - a.current);
  }, [products]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const openNew = () => {
    setEditing({
      id: newId(),
      sku: `PRD-${String(products.length + 1).padStart(3, "0")}`,
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
    setProductOpen(true);
  };

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.warning("No records to export");
      return;
    }
    const rows = [
      ["Product Name", "Product Category", "Unit", "Current Stock Quantity", "Minimum Stock Level", "Last Updated"],
      ...filtered.map((p) => [p.name, p.category, p.unit, p.stockQuantity, p.minimumStockLevel, formatDateTime(p.updatedAt)]),
    ];
    const html = `<table>${rows.map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join("")}</tr>`).join("")}</table>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `unichem-inventory-${Date.now()}.xls`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel report exported successfully");
  };

  const exportHistory = () => {
    if (movements.length === 0) {
      toast.warning("No inventory logs available to export");
      return;
    }
    const rows = [
      ["Date", "Product", "Action", "Before", "After", "Change", "User", "Reason"],
      ...movements.map((m) => [
        formatDateTime(m.createdAt), m.productName, m.type, m.quantityBefore, m.quantityAfter,
        m.quantityChanged, m.actorName, m.reason || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `unichem-inventory-history-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory logs exported to CSV");
  };

  const productColumns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.product_spec")} />,
      cell: ({ row }) => (
        <div className="font-semibold text-slate-800 dark:text-slate-200">
          <div>{row.original.name}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{row.original.sku}</div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.category")} />,
      cell: ({ row }) => <span className="text-slate-500">{row.original.category}</span>,
    },
    {
      accessorKey: "unit",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.unit")} />,
      cell: ({ row }) => <Badge variant="outline">{row.original.unit}</Badge>,
    },
    {
      accessorKey: "stockQuantity",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.quantity")} />,
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {formatNumber(row.original.stockQuantity)}
        </span>
      ),
    },
    {
      accessorKey: "minimumStockLevel",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.threshold")} />,
      cell: ({ row }) => <span className="text-slate-500">{formatNumber(row.original.minimumStockLevel)}</span>,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.last_audited")} />,
      cell: ({ row }) => <span className="text-slate-400">{formatDateTime(row.original.updatedAt)}</span>,
    },
    {
      id: "actions",
      header: t("inventory.adjust_stock"),
      cell: ({ row }) => {
        const p = row.original;
        const low = p.stockQuantity <= p.minimumStockLevel;
        if (user?.role === "salesman") return null;
        return (
          <div className="flex items-center gap-1.5">
            {low && <Badge variant="destructive" className="mr-1 text-[9px] px-1 py-0 h-4">{t("inventory.low_stock")}</Badge>}
            <Button size="icon" variant="ghost" onClick={() => setAdjusting(p)} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><RefreshCw className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setProductOpen(true); }} className="h-7 w-7 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)} className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        );
      },
    },
  ];

  const historyColumns: ColumnDef<InventoryMovement>[] = [
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("common.date")} />,
      cell: ({ row }) => <span className="text-slate-400">{formatDateTime(row.original.createdAt)}</span>,
    },
    {
      accessorKey: "productName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.product_spec")} />,
      cell: ({ row }) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.original.productName}</span>,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.adjust_stock")} />,
      cell: ({ row }) => <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 h-4">{row.original.type.replace("-", " ")}</Badge>,
    },
    {
      accessorKey: "quantityBefore",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.before")} />,
      cell: ({ row }) => <span className="text-slate-500">{formatNumber(row.original.quantityBefore)}</span>,
    },
    {
      accessorKey: "quantityAfter",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.after")} />,
      cell: ({ row }) => <span className="font-bold text-slate-900 dark:text-white">{formatNumber(row.original.quantityAfter)}</span>,
    },
    {
      accessorKey: "actorName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.auditor")} />,
      cell: ({ row }) => <span className="text-slate-600 dark:text-slate-400 font-medium">{row.original.actorName}</span>,
    },
    {
      accessorKey: "reason",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("inventory.reason")} />,
      cell: ({ row }) => <span className="text-slate-400 max-w-xs truncate">{row.original.reason || "-"}</span>,
    },
  ];

  const settings = db.getSettings();

  return (
    <>
      {/* Printable Report (Hidden in browser, visible in print) */}
      <div className="hidden print:block print:p-8 bg-white text-black font-sans w-full min-h-screen">
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {settings.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="Company Logo" className="h-16 w-auto object-contain" />
            ) : (
              <img src="/logo-symbol.png" alt="UniChem" className="h-16 w-16 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-black">{settings.companyName}</h1>
              <p className="text-sm text-gray-600">{t("inventory.catalog")}</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{t("common.date")}: {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}</p>
            <p>{t("inventory.total_lines")}: {products.length}</p>
          </div>
        </div>

        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-black">
              <th className="py-2 px-1">{t("inventory.product_spec")}</th>
              <th className="py-2 px-1">{t("inventory.category")}</th>
              <th className="py-2 px-1">{t("inventory.unit")}</th>
              <th className="py-2 px-1 text-right">{t("inventory.quantity")}</th>
              <th className="py-2 px-1 text-right">{t("inventory.threshold")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-gray-300">
                <td className="py-2 px-1 font-semibold text-black">
                  {p.name}
                  <div className="text-[10px] text-gray-500 font-normal">{p.sku}</div>
                </td>
                <td className="py-2 px-1 text-black">{p.category}</td>
                <td className="py-2 px-1 text-black">{p.unit}</td>
                <td className="py-2 px-1 text-right font-bold text-black">{formatNumber(p.stockQuantity)}</td>
                <td className="py-2 px-1 text-right text-black">{formatNumber(p.minimumStockLevel)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-8 text-xs text-center text-gray-500 border-t border-gray-300 pt-4">
          Generated by UniChem ERP
        </div>
      </div>


    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("nav.inventory")}
        description={t("inventory.desc")}
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs shadow-md shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"><Plus className="h-3.5 w-3.5 me-2" />{t("inventory.add_product")}</Button>}
      />

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid gap-4 grid-cols-1 sm:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Package}
            label={t("inventory.total_items", { defaultValue: "Total Inventory Items" })}
            value={totalStock.toString()}
            numericValue={totalStock}
            formatter={(v) => formatNumber(Math.round(v))}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={AlertTriangle}
            label={t("inventory.low_stock", { defaultValue: "Low Stock Alerts" })}
            value={lowCount.toString()}
            numericValue={lowCount}
            formatter={(v) => Math.round(v).toString()}
            tone={lowCount > 0 ? "danger" : "success"}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={TrendingUp}
            label={t("inventory.stock_value", { defaultValue: "Est. Inventory Value" })}
            value={formatCompactEGP(totalStockValue)}
            numericValue={totalStockValue}
            formatter={(v) => formatCompactEGP(v)}
            tone="success"
          />
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1 border-slate-200/60 dark:border-slate-700">
            <TabsTrigger value="stock" className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm px-4">
              <PackageOpen className="h-3.5 w-3.5 me-1.5" />
              {t("inventory.catalog")}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm px-4">
              <RefreshCw className="h-3.5 w-3.5 me-1.5" />
              {t("inventory.ledger")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-6 m-0">
            {/* Top - Safety Buffer Chart (Full Width) */}
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("inventory.safety_buffer_status", { defaultValue: "Safety Buffer Status" })}</GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-72">
                {categoryStockData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No category stock data</div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStockData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-slate-400 font-medium" />
                        <YAxis className="text-[10px]" tickFormatter={(v) => formatNumber(v)} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const ratio = data.minimum > 0 ? (data.current / data.minimum).toFixed(1) : "N/A";
                              return (
                                <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-slate-900 dark:text-white">{data.name}</p>
                                  <p className="text-emerald-500 font-medium">{t("inventory.stock", { defaultValue: "Stock" })}: {formatNumber(data.current)}</p>
                                  <p className="text-amber-500 font-medium">{t("inventory.threshold", { defaultValue: "Safety Level" })}: {formatNumber(data.minimum)}</p>
                                  <p className="text-slate-400 font-medium">{t("inventory.ratio", { defaultValue: "Ratio" })}: {ratio}x</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="current" name={t("inventory.stock", { defaultValue: "Stock" })} fill="#10b981" radius={[3, 3, 0, 0]} barSize={24} />
                        <Bar dataKey="minimum" name={t("inventory.threshold", { defaultValue: "Safety Level" })} fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>

            {/* Bottom - Stock Table (Full Width) */}
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("inventory.current_stock_levels", { defaultValue: "Current Stock Levels" })}</GlowCardTitle>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input className="ps-8 h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 placeholder-slate-400" placeholder={t("inventory.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t("inventory.category")} />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">{t("inventory.all_categories")}</SelectItem>
                      {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={lowOnly} onValueChange={setLowOnly}>
                    <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t("inventory.all_levels")} />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">{t("inventory.all_levels")}</SelectItem>
                      <SelectItem value="low">{t("inventory.low_stock_only")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={exportExcel} className="h-8 text-xs gap-1.5 w-full sm:w-auto border-slate-200 dark:border-slate-700">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("common.actions.export")}</span>
                  </Button>
                </div>
              </GlowCardHeader>
              <GlowCardContent className="p-0">
                {loading ? (
                  <div className="p-4"><TableSkeleton columns={6} rows={5} /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 grid place-items-center mb-4">
                      <PackageOpen className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("inventory.no_products")}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">{t("inventory.no_search_results")}</p>
                  </div>
                ) : (
                  <DataTable columns={productColumns} data={filtered} showSearch={false} />
                )}
              </GlowCardContent>
            </GlowCard>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 m-0">
            {/* Top movement ledger flow chart (Full Width inside tab) */}
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("inventory.movement_ledger_7d", { defaultValue: "Inventory Movement Ledger (Last 7 Days)" })}</GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-80">
                {movementHistoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No movement history</div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={movementHistoryData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <defs>
                          <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" className="text-[10px] text-slate-400 font-medium" />
                        <YAxis className="text-[10px]" tickFormatter={(v) => formatNumber(v)} label={{ value: t("inventory.units_flowed", { defaultValue: "Units Flowed" }), angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-slate-900 dark:text-white">{data.date}</p>
                                  <p className="text-emerald-500 font-medium">{t("inventory.inward_stock_in", { defaultValue: "Inward (Stock In)" })}: {formatNumber(data.inward)} {t("inventory.units", { defaultValue: "units" })}</p>
                                  <p className="text-rose-500 font-medium">{t("inventory.outward_stock_out", { defaultValue: "Outward (Stock Out)" })}: {formatNumber(data.outward)} {t("inventory.units", { defaultValue: "units" })}</p>
                                  <p className="text-slate-500 font-medium">{t("inventory.net_change", { defaultValue: "Net Change" })}: {formatNumber(data.inward - data.outward)} {t("inventory.units", { defaultValue: "units" })}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="inward" name={t("inventory.inward_desc", { defaultValue: "Stock Inward (Purchased/Added)" })} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInward)" />
                        <Area type="monotone" dataKey="outward" name={t("inventory.outward_desc", { defaultValue: "Stock Outward (Sold/Removed)" })} stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOutward)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>

            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("inventory.movement_logs", { defaultValue: "Movement Logs" })}</GlowCardTitle>
                <Button variant="outline" size="sm" onClick={exportHistory} className="h-8 text-xs border-slate-200 dark:border-slate-700">
                  <Download className="h-3.5 w-3.5 me-1.5" />
                  {t("common.actions.export")} CSV
                </Button>
              </GlowCardHeader>
              <GlowCardContent className="p-0">
                {loading ? (
                  <div className="p-4"><TableSkeleton columns={5} rows={5} /></div>
                ) : movements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">No logs found</p>
                  </div>
                ) : (
                  <DataTable columns={historyColumns} data={movements} showSearch={false} />
                )}
              </GlowCardContent>
            </GlowCard>
          </TabsContent>
        </Tabs>
      </motion.div>

      {editing && (
        <ProductDialog
          open={productOpen}
          setOpen={setProductOpen}
          product={editing}
          setProduct={setEditing}
          onSave={() => {
            if (!editing.name.trim()) return toast.error("Product name required");
            if (!editing.category.trim()) return toast.error("Product category required");
            db.upsertProduct(editing);
            toast.success("Product saved");
            setProductOpen(false);
          }}
        />
      )}

      {adjusting && user && (
        <AdjustmentDialog product={adjusting} actor={user} onClose={() => setAdjusting(null)} />
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="font-sans dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("inventory.delete_product_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              {t("inventory.delete_product_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs">{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-xs text-white"
              onClick={() => {
                if (!deleteTarget) return;
                db.deleteProduct(deleteTarget.id);
                toast.success(t("inventory.product_deleted"));
                setDeleteTarget(null);
              }}
            >
              {t("inventory.delete_product")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
    </>
  );
}

function ProductDialog({
  open, setOpen, product, setProduct, onSave,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  product: Product;
  setProduct: (product: Product) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="sm:max-w-md font-sans dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
        <SheetHeader>
          <SheetTitle className="text-sm font-bold">{product.name ? t("inventory.edit_product") : t("inventory.add_product")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-6 text-xs overflow-y-auto">
          <Field label={t("inventory.product_spec")}><Input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} className="h-9" /></Field>
          <Field label={t("inventory.category")}><Input value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} className="h-9" /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("inventory.unit")}>
              <Select value={product.unit} onValueChange={(unit) => setProduct({ ...product, unit })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("inventory.quantity")}><Input type="number" min={0} step="0.01" value={product.stockQuantity === 0 ? "" : product.stockQuantity} onChange={(e) => setProduct({ ...product, stockQuantity: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("inventory.threshold")}><Input type="number" min={0} step="0.01" value={product.minimumStockLevel === 0 ? "" : product.minimumStockLevel} onChange={(e) => setProduct({ ...product, minimumStockLevel: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
            <Field label={t("deals.price")}><Input type="number" min={0} step="0.01" value={product.defaultPrice === 0 ? "" : product.defaultPrice} onChange={(e) => setProduct({ ...product, defaultPrice: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
          </div>
        </div>
        <SheetFooter className="mt-4 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.actions.cancel")}</Button>
          <Button size="sm" onClick={onSave}>{t("common.actions.save")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AdjustmentDialog({ product, actor, onClose }: { product: Product; actor: User; onClose: () => void }) {
  const db = useDb();
  const { t } = useTranslation("common");
  const [mode, setMode] = useState<InventoryAdjustmentType>("increase");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");

  const preview = mode === "increase"
    ? product.stockQuantity + quantity
    : mode === "decrease"
      ? Math.max(0, product.stockQuantity - quantity)
      : quantity;

  const save = () => {
    if (quantity < 0) return toast.error(t("inventory.qty_negative"));
    db.adjustInventory(product.id, preview, actor, mode, reason || undefined);
    toast.success(t("inventory.stock_adjusted"));
    onClose();
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md font-sans dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
        <SheetHeader>
          <SheetTitle className="text-sm font-bold">{t("inventory.adjust_stock")} - {product.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-6 text-xs overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={mode === "increase" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("increase")}><Plus className="h-3.5 w-3.5 ms-1" />{t("inventory.increase")}</Button>
            <Button type="button" variant={mode === "decrease" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("decrease")}><Minus className="h-3.5 w-3.5 ms-1" />{t("inventory.decrease")}</Button>
            <Button type="button" variant={mode === "correction" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("correction")}><RefreshCw className="h-3.5 w-3.5 ms-1" />{t("inventory.correct")}</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label={t("inventory.adjustment")}><Input type="number" min={0} step="0.01" value={quantity === 0 ? "" : quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} className="h-9" /></Field>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-[10px] font-semibold text-slate-400 uppercase">{t("inventory.projected_balance")}</div>
              <div className="text-base font-bold text-slate-850 dark:text-white mt-0.5">{formatNumber(preview)} {product.unit}</div>
            </div>
          </div>
          <Field label={t("inventory.reason")}><Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" /></Field>
        </div>
        <SheetFooter className="mt-4 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>{t("common.actions.cancel")}</Button>
          <Button size="sm" onClick={save}>{t("common.actions.save")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-slate-500">{label}</Label>{children}</div>;
}

function Stat({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" }) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition">
      <CardContent className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className={cn("text-2xl font-black mt-1", tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-white")}>{value}</div>
      </CardContent>
    </Card>
  );
}

