import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PackagePlus, Pencil, Trash2, Search, Download, Printer, Plus, Minus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { InventoryAdjustmentType, Product, User } from "@/lib/types";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory - UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><InventoryPage /></RequireAuth>,
});

const units = ["KG", "Ton", "Bag", "Drum", "L", "Box", "Piece"];

function InventoryPage() {
  const { user } = useAuth();
  const db = useDb();
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
  };

  const exportHistory = () => {
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
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Inventory"
        description="Finance stock control for products, quantities, alerts, and history."
        actions={<Button size="lg" onClick={openNew}><PackagePlus className="h-5 w-5 mr-2" />Add Product</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Products" value={formatNumber(products.length)} />
        <Stat label="Total stock units" value={formatNumber(totalStock)} />
        <Stat label="Low stock" value={formatNumber(lowCount)} tone={lowCount ? "warning" : "normal"} />
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Inventory</TabsTrigger>
          <TabsTrigger value="history">Inventory History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_220px_220px_auto_auto]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 h-11" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={lowOnly} onValueChange={setLowOnly}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock levels</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-11" onClick={exportExcel}><Download className="h-4 w-4 mr-2" />Excel</Button>
              <Button variant="outline" className="h-11" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product Name</th>
                    <th className="px-4 py-3 font-medium">Product Category</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium text-right">Current Stock Quantity</th>
                    <th className="px-4 py-3 font-medium text-right">Minimum Stock Level</th>
                    <th className="px-4 py-3 font-medium">Last Updated</th>
                    <th className="px-4 py-3 w-44"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No products match your filters.</td></tr>
                  ) : filtered.map((p) => {
                    const low = p.stockQuantity <= p.minimumStockLevel;
                    return (
                      <tr key={p.id} className={low ? "border-t bg-warning/20" : "border-t"}>
                        <td className="px-4 py-3 font-medium">
                          <div>{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        </td>
                        <td className="px-4 py-3">{p.category}</td>
                        <td className="px-4 py-3">{p.unit}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatNumber(p.stockQuantity)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(p.minimumStockLevel)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {low && <Badge className="mr-1 bg-warning text-warning-foreground hover:bg-warning">Low Stock</Badge>}
                            <Button size="icon" variant="ghost" onClick={() => setAdjusting(p)}><RefreshCw className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setProductOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventory History</CardTitle>
              <Button variant="outline" onClick={exportHistory}><Download className="h-4 w-4 mr-2" />Export</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date / Time</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium text-right">Before</th>
                    <th className="px-4 py-3 font-medium text-right">After</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No inventory changes yet.</td></tr>
                  ) : movements.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(m.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">{m.productName}</td>
                      <td className="px-4 py-3 capitalize">{m.type.replace("-", " ")}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(m.quantityBefore)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatNumber(m.quantityAfter)}</td>
                      <td className="px-4 py-3">{m.actorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this product?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                db.deleteProduct(deleteTarget.id);
                toast.success("Product deleted");
                setDeleteTarget(null);
              }}
            >
              Delete
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
      <DialogContent>
        <DialogHeader><DialogTitle>{product.name ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Product Name"><Input className="h-11" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} /></Field>
          <Field label="Product Category"><Input className="h-11" value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Unit">
              <Select value={product.unit} onValueChange={(unit) => setProduct({ ...product, unit })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Initial / Current Stock Quantity"><Input className="h-11" type="number" min={0} step="0.01" value={product.stockQuantity} onChange={(e) => setProduct({ ...product, stockQuantity: parseFloat(e.target.value) || 0 })} /></Field>
          </div>
          <Field label="Minimum Stock Level"><Input className="h-11" type="number" min={0} step="0.01" value={product.minimumStockLevel} onChange={(e) => setProduct({ ...product, minimumStockLevel: parseFloat(e.target.value) || 0 })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onSave}>Save Product</Button>
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
    toast.success("Stock updated");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Update Stock - {product.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={mode === "increase" ? "default" : "outline"} className="h-12" onClick={() => setMode("increase")}><Plus className="h-4 w-4 mr-1" />Increase</Button>
            <Button type="button" variant={mode === "decrease" ? "default" : "outline"} className="h-12" onClick={() => setMode("decrease")}><Minus className="h-4 w-4 mr-1" />Decrease</Button>
            <Button type="button" variant={mode === "correction" ? "default" : "outline"} className="h-12" onClick={() => setMode("correction")}><RefreshCw className="h-4 w-4 mr-1" />Correct</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={mode === "correction" ? "Correct Stock Quantity" : "Quantity"}><Input className="h-11" type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} /></Field>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">After update</div>
              <div className="text-2xl font-bold">{formatNumber(preview)} {product.unit}</div>
            </div>
          </div>
          <Field label="Reason for adjustment (optional)"><Input className="h-11" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save Stock Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Stat({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={tone === "warning" ? "text-2xl font-bold mt-1 text-warning-foreground" : "text-2xl font-bold mt-1"}>{value}</div>
      </CardContent>
    </Card>
  );
}
