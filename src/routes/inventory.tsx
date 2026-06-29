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
import { formatDateTime, formatNumber } from "@/lib/format";
import type { InventoryAdjustmentType, Product, User, InventoryMovement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { PageTransition } from "@/components/ui/page-transition";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory - UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><InventoryPage /></RequireAuth>,
});

const units = ["KG", "Ton", "Bag", "Drum", "L", "Box", "Piece"];

function InventoryPage() {
  const { user } = useAuth();
  const db = useDb();
  const { t } = useTranslation("common");
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
  const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0);

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

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("nav.inventory")}
        description={t("inventory.desc")}
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs"><PackagePlus className="h-4 w-4 ms-2" />{t("inventory.add_product")}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("inventory.total_lines")} value={formatNumber(products.length)} />
        <Stat label={t("inventory.total_stock")} value={formatNumber(totalStock)} />
        <Stat label={t("inventory.low_stock")} value={formatNumber(lowCount)} tone={lowCount ? "warning" : "normal"} />
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <TabsTrigger value="current" className="rounded-lg text-xs font-semibold">{t("inventory.catalog")}</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">{t("inventory.ledger")}</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_200px_200px_auto_auto]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto" />
                <Input className="ps-9 h-10 text-xs focus-visible:ring-indigo-500" placeholder={t("inventory.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 text-xs"><SelectValue placeholder={t("inventory.all_categories")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.all_categories")}</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={lowOnly} onValueChange={setLowOnly}>
                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.all_levels")}</SelectItem>
                  <SelectItem value="low">{t("inventory.low_stock_only")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-10 text-xs" onClick={exportExcel}><Download className="h-4 w-4 ms-2" />{t("common.actions.export")}</Button>
              <Button variant="outline" className="h-10 text-xs" onClick={() => window.print()}><Printer className="h-4 w-4 ms-2" />{t("common.actions.print")}</Button>
            </CardContent>
          </Card>

          {loading ? (
            <TableSkeleton columns={6} rows={5} />
          ) : (
            <DataTable columns={productColumns} data={filtered} />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={exportHistory} className="h-8 text-xs"><Download className="h-3.5 w-3.5 ms-2" />{t("common.actions.export")}</Button>
          </div>
          <DataTable columns={historyColumns} data={movements} />
        </TabsContent>
      </Tabs>

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
            <AlertDialogTitle className="text-sm font-bold text-slate-900 dark:text-white">Delete Product record</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete this product from the inventory ledger? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-xs text-white"
              onClick={() => {
                if (!deleteTarget) return;
                db.deleteProduct(deleteTarget.id);
                toast.success("Product deleted");
                setDeleteTarget(null);
              }}
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
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
            <Field label={t("inventory.quantity")}><Input type="number" min={0} step="0.01" value={product.stockQuantity} onChange={(e) => setProduct({ ...product, stockQuantity: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("inventory.threshold")}><Input type="number" min={0} step="0.01" value={product.minimumStockLevel} onChange={(e) => setProduct({ ...product, minimumStockLevel: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
            <Field label={t("deals.price")}><Input type="number" min={0} step="0.01" value={product.defaultPrice} onChange={(e) => setProduct({ ...product, defaultPrice: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
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
    if (quantity < 0) return toast.error("Quantity cannot be negative");
    db.adjustInventory(product.id, preview, actor, mode, reason || undefined);
    toast.success("Stock quantity adjusted");
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
            <Button type="button" variant={mode === "increase" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("increase")}><Plus className="h-3.5 w-3.5 ms-1" />Increase</Button>
            <Button type="button" variant={mode === "decrease" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("decrease")}><Minus className="h-3.5 w-3.5 ms-1" />Decrease</Button>
            <Button type="button" variant={mode === "correction" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("correction")}><RefreshCw className="h-3.5 w-3.5 ms-1" />Correct</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label={"Adjustment"}><Input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} className="h-9" /></Field>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Projected Balance</div>
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

