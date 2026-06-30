import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Plus, Archive, Pencil, Search, FolderOpen } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import type { Customer } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { PageTransition } from "@/components/ui/page-transition";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — UniChem ERP" }] }),
  component: () => <RequireAuth><CustomersPage /></RequireAuth>,
});

function CustomersPage() {
  const db = useDb();
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(true);
  const list = db.listCustomers();
  const [q, setQ] = useState("");

  useEffect(() => {
    const tId = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(tId);
  }, []);

  const filtered = useMemo(
    () => list.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.company ?? "").toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ id: newId(), name: "", company: "", phone: "", email: "", address: "", taxId: "", archived: false, createdAt: nowIso() });
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setOpen(true);
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("customers.name")} />,
      cell: ({ row }) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.original.name}</span>,
    },
    {
      accessorKey: "company",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("customers.company")} />,
      cell: ({ row }) => <span className="text-slate-500">{row.original.company || "—"}</span>,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("customers.phone")} />,
      cell: ({ row }) => <span className="text-slate-500">{row.original.phone || "—"}</span>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("customers.email")} />,
      cell: ({ row }) => <span className="text-slate-500">{row.original.email || "—"}</span>,
    },
    {
      id: "actions",
      header: t("common.actions.title"),
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => openEdit(c)} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><Pencil className="h-3.5 w-3.5" /></Button>
          </div>
        );
      },
    }
  ];

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("nav.customers")}
        description={t("customers.desc")}
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs"><Plus className="h-4 w-4 ms-2" />{t("customers.new_customer")}</Button>}
      />

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 relative">
          <Search className="h-4 w-4 absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-7 rtl:left-auto" />
          <Input className="ps-9 h-10 text-xs focus-visible:ring-indigo-500" placeholder={t("customers.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </CardContent>
      </Card>

      {loading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("customers.no_customers")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {q ? t("customers.no_search_results") : t("customers.empty_dir")}
            </p>
            {!q && (
              <Button size="sm" onClick={openNew} className="mt-4">
                <Plus className="h-4 w-4 ms-2" /> {t("customers.add_first")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      <CustomerDialog open={open} setOpen={setOpen} editing={editing} setEditing={setEditing} />
    </PageTransition>
  );
}

function CustomerDialog({
  open, setOpen, editing, setEditing,
}: { open: boolean; setOpen: (v: boolean) => void; editing: Customer | null; setEditing: (c: Customer | null) => void }) {
  const db = useDb();
  const { t } = useTranslation("common");
  if (!editing) return null;
  const update = (patch: Partial<Customer>) => setEditing({ ...editing, ...patch });
  const save = () => {
    if (!editing.name.trim()) return toast.error("Name is required");
    db.upsertCustomer(editing);
    toast.success(t("customers.updated"));
    setOpen(false);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="sm:max-w-md font-sans dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
        <SheetHeader>
          <SheetTitle className="text-sm font-bold">{editing.name ? t("customers.edit_profile") : t("customers.create_record")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-6 text-xs overflow-y-auto">
          <Field label={t("customers.name")}><Input value={editing.name} onChange={(e) => update({ name: e.target.value })} className="h-9" /></Field>
          <Field label={t("customers.company")}><Input value={editing.company ?? ""} onChange={(e) => update({ company: e.target.value })} className="h-9" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("customers.phone")}><Input value={editing.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} className="h-9" /></Field>
            <Field label={t("customers.email")}><Input type="email" value={editing.email ?? ""} onChange={(e) => update({ email: e.target.value })} className="h-9" /></Field>
          </div>
          <Field label={t("customers.address")}><Input value={editing.address ?? ""} onChange={(e) => update({ address: e.target.value })} className="h-9" /></Field>
          <Field label={t("customers.tax_id")}><Input value={editing.taxId ?? ""} onChange={(e) => update({ taxId: e.target.value })} className="h-9" /></Field>
        </div>
        <SheetFooter className="mt-4 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.actions.cancel")}</Button>
          <Button size="sm" onClick={save}>{t("common.actions.save")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-slate-500">{label}</Label>{children}</div>;
}
