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
import { Plus, Archive, Pencil, Search, Users, FolderOpen } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — UniChem ERP" }] }),
  component: () => <RequireAuth><CustomersPage /></RequireAuth>,
});

function CustomersPage() {
  const db = useDb();
  const [loading, setLoading] = useState(true);
  const list = db.listCustomers();
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(
    () => list.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.company ?? "").toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ id: newId(), name: "", company: "", phone: "", email: "", address: "", archived: false, createdAt: nowIso() });
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Customers"
        description="Maintain client accounts, corporate billing records, and directory contact details."
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs"><Plus className="h-4 w-4 mr-2" />New Customer</Button>}
      />

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 relative">
          <Search className="h-4 w-4 absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9 h-10 text-xs focus-visible:ring-indigo-500 placeholder-slate-455" placeholder="Search customers name or company..." value={q} onChange={(e) => setQ(e.target.value)} />
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
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No customers found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {q ? "No records match your active search keyword." : "Your customer directory is currently empty."}
            </p>
            {!q && (
              <Button size="sm" onClick={openNew} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Add First Customer
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
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5 hidden md:table-cell">Company</th>
                  <th className="px-5 py-3.5 hidden md:table-cell">Phone</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">Email</th>
                  <th className="px-5 py-3.5 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-slate-500">{c.company ?? "—"}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-slate-500">{c.phone ?? "—"}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-slate-500">{c.email ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { db.archiveCustomer(c.id); toast.success("Customer archived"); }} className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
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
    if (!editing.name.trim()) return toast.error("Name is required");
    db.upsertCustomer(editing);
    toast.success("Customer record updated");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md font-sans dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{editing.name ? "Edit customer profile" : "Create customer record"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 py-2 text-xs">
          <Field label="Name *"><Input value={editing.name} onChange={(e) => update({ name: e.target.value })} className="h-9" /></Field>
          <Field label="Company"><Input value={editing.company ?? ""} onChange={(e) => update({ company: e.target.value })} className="h-9" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} className="h-9" /></Field>
            <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => update({ email: e.target.value })} className="h-9" /></Field>
          </div>
          <Field label="Address"><Input value={editing.address ?? ""} onChange={(e) => update({ address: e.target.value })} className="h-9" /></Field>
          <Field label="Tax ID"><Input value={editing.taxId ?? ""} onChange={(e) => update({ taxId: e.target.value })} className="h-9" /></Field>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={save}>Save customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-slate-500">{label}</Label>{children}</div>;
}
