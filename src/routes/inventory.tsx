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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackagePlus, Pencil, Trash2, Search, Download, Printer, Plus, Minus, RefreshCw, Layers, SlidersHorizontal, PackageOpen } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { InventoryAdjustmentType, Product, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory - UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><InventoryPage /></RequireAuth>,
});

const units = ["KG", "Ton", "Bag", "Drum", "L", "Box", "Piece"];

function InventoryPage() {
  const { user } = useAuth();
  const db = useDb();
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

  // Simulate premium skeleton loader
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Warehouse Inventory"
        description="Verify product quantities, check thresholds, and adjust physical stock levels."
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs"><PackagePlus className="h-4 w-4 mr-2" />Add Product</Button>}
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Product Lines" value={formatNumber(products.length)} />
        <Stat label="Total Warehouse Stock" value={formatNumber(totalStock)} />
        <Stat label="Low Stock Reserves" value={formatNumber(lowCount)} tone={lowCount ? "warning" : "normal"} />
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <TabsTrigger value="current" className="rounded-lg text-xs font-semibold">Current Catalog</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">Ledger History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {/* Advanced Filter Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_200px_200px_auto_auto]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9 h-10 text-xs focus-visible:ring-indigo-500 placeholder-slate-455" placeholder="Search product SKU, name..." value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={lowOnly} onValueChange={setLowOnly}>
                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock levels</SelectItem>
                  <SelectItem value="low">Low Stock Alerts Only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-10 text-xs" onClick={exportExcel}><Download className="h-4 w-4 mr-2" />Export Excel</Button>
              <Button variant="outline" className="h-10 text-xs" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print list</Button>
            </CardContent>
          </Card>

          {/* Catalog Grid Table */}
          {loading ? (
            <Card className="border-slate-200 dark:border-slate-800">
              <div className="p-6 space-y-4">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
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
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No products found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {query || category !== "all" || lowOnly !== "all"
                    ? "No items match your active filters. Try refining your keywords."
                    : "The warehouse catalog is empty. Start by adding chemical products."}
                </p>
                {!query && category === "all" && lowOnly === "all" && (
                  <Button size="sm" onClick={openNew} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" /> Add First Product
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr className="text-left font-semibold">
                      <th className="px-5 py-3">Product Specifications</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Packing Unit</th>
                      <th className="px-5 py-3 text-right">Physical Quantity</th>
                      <th className="px-5 py-3 text-right">Minimum Threshold</th>
                      <th className="px-5 py-3">Last Audited</th>
                      <th className="px-5 py-3 text-right w-44">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((p) => {
                      const low = p.stockQuantity <= p.minimumStockLevel;
                      return (
                        <tr key={p.id} className={cn("hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition-colors", low ? "bg-amber-500/5 dark:bg-amber-500/10" : "")}>
                          <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            <div>{p.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{p.sku}</div>
                          </td>
                          <td className="px-5 py-3 text-slate-500">{p.category}</td>
                          <td className="px-5 py-3 text-slate-500"><Badge variant="outline">{p.unit}</Badge></td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">{formatNumber(p.stockQuantity)}</td>
                          <td className="px-5 py-3 text-right text-slate-500">{formatNumber(p.minimumStockLevel)}</td>
                          <td className="px-5 py-3 text-slate-400">{formatDateTime(p.updatedAt)}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {low && <Badge variant="destructive" className="mr-1 text-[9px] px-1 py-0 h-4">Low Stock</Badge>}
                              <Button size="icon" variant="ghost" onClick={() => setAdjusting(p)} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><RefreshCw className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setProductOpen(true); }} className="h-7 w-7 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)} className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold">Ledger Log History</CardTitle>
                <CardDescription className="text-xs">Physical inventory entries and adjustments audit log.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportHistory} className="h-8 text-xs"><Download className="h-3.5 w-3.5 mr-2" />Export Logs</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr className="text-left font-semibold">
                    <th className="px-5 py-3">Date / Time</th>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">Adjustment Type</th>
                    <th className="px-5 py-3 text-right">Before</th>
                    <th className="px-5 py-3 text-right">After</th>
                    <th className="px-5 py-3">Auditor</th>
                    <th className="px-5 py-3">Reason / Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movements.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">No stock adjustment histories recorded.</td></tr>
                  ) : movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                      <td className="px-5 py-3 text-slate-400">{formatDateTime(m.createdAt)}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{m.productName}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 h-4">{m.type.replace("-", " ")}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">{formatNumber(m.quantityBefore)}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">{formatNumber(m.quantityAfter)}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-medium">{m.actorName}</td>
                      <td className="px-5 py-3 text-slate-400 max-w-xs truncate">{m.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Editing Dialog */}
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

      {/* Adjusting Dialog */}
      {adjusting && user && (
        <AdjustmentDialog product={adjusting} actor={user} onClose={() => setAdjusting(null)} />
      )}

      {/* Delete Target Modal */}
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
    </div>
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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md font-sans dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{product.name ? "Edit product line" : "Add product catalog item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 text-xs">
          <Field label="Product Name *"><Input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} className="h-9" /></Field>
          <Field label="Product Category *"><Input value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} className="h-9" /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Unit">
              <Select value={product.unit} onValueChange={(unit) => setProduct({ ...product, unit })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Current Stock"><Input type="number" min={0} step="0.01" value={product.stockQuantity} onChange={(e) => setProduct({ ...product, stockQuantity: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Minimum Threshold"><Input type="number" min={0} step="0.01" value={product.minimumStockLevel} onChange={(e) => setProduct({ ...product, minimumStockLevel: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
            <Field label="Default Price (EGP)"><Input type="number" min={0} step="0.01" value={product.defaultPrice} onChange={(e) => setProduct({ ...product, defaultPrice: parseFloat(e.target.value) || 0 })} className="h-9" /></Field>
          </div>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={onSave}>Save product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustmentDialog({ product, actor, onClose }: { product: Product; actor: User; onClose: () => void }) {
  const db = useDb();
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
    toast.success("Stock quantity adjusted in warehouse logs");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md font-sans dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Update Stock Levels - {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={mode === "increase" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("increase")}><Plus className="h-3.5 w-3.5 mr-1" />Increase</Button>
            <Button type="button" variant={mode === "decrease" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("decrease")}><Minus className="h-3.5 w-3.5 mr-1" />Decrease</Button>
            <Button type="button" variant={mode === "correction" ? "default" : "outline"} className="h-10 text-xs" onClick={() => setMode("correction")}><RefreshCw className="h-3.5 w-3.5 mr-1" />Correct</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label={mode === "correction" ? "Set exact quantity" : "Adjustment amount"}><Input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} className="h-9" /></Field>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Projected Balance</div>
              <div className="text-base font-bold text-slate-850 dark:text-white mt-0.5">{formatNumber(preview)} {product.unit}</div>
            </div>
          </div>
          <Field label="Reason / Transaction Reference"><Input placeholder="E.g. Monthly recount, PO delivery..." value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" /></Field>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save}>Commit stock update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
