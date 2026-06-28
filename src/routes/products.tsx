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
import { Plus, Archive, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatEGP } from "@/lib/format";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><ProductsPage /></RequireAuth>,
});

function ProductsPage() {
  const db = useDb();
  const list = db.listProducts();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => { setEditing({ id: newId(), sku: "", name: "", unit: "kg", defaultPrice: 0, archived: false, createdAt: nowIso() }); setOpen(true); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Products" description="Manage product catalog & default prices."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Product</Button>} />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium text-right">Default price</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No products</td></tr> :
                list.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.unit}</td>
                    <td className="px-4 py-3 text-right">{formatEGP(p.defaultPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { db.archiveProduct(p.id); toast.success("Archived"); }}>
                        <Archive className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {editing && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.name ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="SKU *"><Input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></Field>
              <Field label="Name *"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit"><Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></Field>
                <Field label="Default price (EGP)"><Input type="number" min={0} step="0.01" value={editing.defaultPrice} onChange={(e) => setEditing({ ...editing, defaultPrice: parseFloat(e.target.value) || 0 })} /></Field>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!editing.name.trim() || !editing.sku.trim()) return toast.error("Name & SKU required");
                db.upsertProduct(editing); toast.success("Saved"); setOpen(false);
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
