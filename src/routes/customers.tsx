import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Archive, Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — UniChem ERP" }] }),
  component: () => <RequireAuth><CustomersPage /></RequireAuth>,
});

function CustomersPage() {
  const db = useDb();
  const list = db.listCustomers();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => list.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.company ?? "").toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => { setEditing({ id: newId(), name: "", company: "", phone: "", email: "", address: "", archived: false, createdAt: nowIso() }); setOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setOpen(true); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Customers"
        description="Manage your customer directory."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Customer</Button>}
      />

      <Card className="mb-4">
        <CardContent className="p-4 relative">
          <Search className="h-4 w-4 absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Company</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No customers</td></tr> :
                filtered.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.company ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { db.archiveCustomer(c.id); toast.success("Archived"); }}>
                        <Archive className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CustomerDialog open={open} setOpen={setOpen} editing={editing} setEditing={setEditing} />
    </div>
  );
}

function CustomerDialog({
  open, setOpen, editing, setEditing,
}: { open: boolean; setOpen: (v: boolean) => void; editing: Customer | null; setEditing: (c: Customer | null) => void }) {
  const db = useDb();
  if (!editing) return null;
  const update = (patch: Partial<Customer>) => setEditing({ ...editing, ...patch });
  const save = () => {
    if (!editing.name.trim()) return toast.error("Name required");
    db.upsertCustomer(editing);
    toast.success("Saved");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing.name ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Name *"><Input value={editing.name} onChange={(e) => update({ name: e.target.value })} /></Field>
          <Field label="Company"><Input value={editing.company ?? ""} onChange={(e) => update({ company: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => update({ email: e.target.value })} /></Field>
          </div>
          <Field label="Address"><Input value={editing.address ?? ""} onChange={(e) => update({ address: e.target.value })} /></Field>
          <Field label="Tax ID"><Input value={editing.taxId ?? ""} onChange={(e) => update({ taxId: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
