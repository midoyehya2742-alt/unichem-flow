import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { newId, nowIso } from "@/lib/store";
import { useCustomers, useDeals, useUpsertCustomer } from "@/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Plus, Archive, Pencil, Search, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Customer } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { PageTransition } from "@/components/ui/page-transition";
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from "@/components/ui/glow-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { motion } from "framer-motion";
import { Users, TrendingUp, Building2, UserPlus } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { formatCompactEGP } from "@/lib/format";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — UniChem ERP" }] }),
  component: () => <RequireAuth><CustomersPage /></RequireAuth>,
});

function CustomersPage() {
  const { data: customers, isLoading: loading } = useCustomers();
  const { data: deals } = useDeals();
  const { t } = useTranslation("common");
  const list = useMemo(() => (customers ?? []).filter(c => !c.archived), [customers]);
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () => list.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.company ?? "").toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  const allDeals = deals ?? [];
  const now = new Date();
  
  // KPI Calculations
  const newCustomersCount = useMemo(() => {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return list.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
  }, [list]);

  const activeCustomersCount = useMemo(() => {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentDeals = allDeals.filter(d => new Date(d.dealDate) >= thirtyDaysAgo);
    const uniqueCustomerIds = new Set(recentDeals.map(d => d.customerId));
    return uniqueCustomerIds.size;
  }, [allDeals]);

  const customerRevenue = useMemo(() => {
    const revMap: Record<string, number> = {};
    allDeals.forEach(d => {
      revMap[d.customerId] = (revMap[d.customerId] || 0) + d.total;
    });
    return list.map(c => ({
      name: c.name,
      company: c.company || c.name,
      revenue: revMap[c.id] || 0
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [list, allDeals]);

  const COLORS = ["#4f46e5", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

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
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs shadow-md shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"><Plus className="h-3.5 w-3.5 me-2" />{t("customers.new_customer")}</Button>}
      />

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid gap-4 grid-cols-1 sm:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Users}
            label={t("customers.total_customers", { defaultValue: "Total Customers" })}
            value={list.length.toString()}
            numericValue={list.length}
            formatter={(v) => Math.round(v).toString()}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={UserPlus}
            label={t("customers.new_customers_30d", { defaultValue: "New Customers (30d)" })}
            value={newCustomersCount.toString()}
            numericValue={newCustomersCount}
            formatter={(v) => Math.round(v).toString()}
            tone="success"
            trend={newCustomersCount > 0 ? 100 : 0}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={TrendingUp}
            label={t("customers.active_customers", { defaultValue: "Active Ordering (30d)" })}
            value={activeCustomersCount.toString()}
            numericValue={activeCustomersCount}
            formatter={(v) => Math.round(v).toString()}
            tone="warning"
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Directory List (2/3 width) */}
        <div className="lg:col-span-8 space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("customers.directory_title", { defaultValue: "Customer Directory" })}</GlowCardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto" />
                  <Input 
                    className="ps-9 h-9 text-xs focus-visible:ring-indigo-500 placeholder-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" 
                    placeholder={t("customers.search")} 
                    value={q} 
                    onChange={(e) => setQ(e.target.value)} 
                  />
                </div>
              </GlowCardHeader>
              <GlowCardContent className="p-0">
                {loading ? (
                  <div className="p-4"><TableSkeleton columns={5} rows={5} /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
                      <FolderOpen className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("customers.no_customers")}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                      {q ? t("customers.no_search_results") : t("customers.empty_dir")}
                    </p>
                    {!q && (
                      <Button size="sm" onClick={openNew} className="mt-4 shadow-sm shadow-indigo-600/10">
                        <Plus className="h-4 w-4 me-2" /> {t("customers.add_first")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <DataTable columns={columns} data={filtered} />
                )}
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        </div>

        {/* Right Column - Top Customers Analytics (1/3 width) */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("customers.top_customers_revenue", { defaultValue: "Top Customers by Revenue" })}
                </GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-80">
                {customerRevenue.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No active customers
                  </div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerRevenue} margin={{ top: 20, right: 10, left: 10, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tickFormatter={(v) => `E£${(v / 1000).toFixed(0)}k`} className="text-[10px] text-slate-400 font-medium" axisLine={false} tickLine={false} />
                        <YAxis dataKey="company" type="category" width={80} className="text-[10px] font-semibold text-slate-600 dark:text-slate-300" axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(v: number) => formatCompactEGP(v)} />
                        <Bar dataKey="revenue" name={t("customers.revenue", { defaultValue: "Revenue" })} radius={[0, 4, 4, 0]} barSize={20}>
                          {customerRevenue.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        </div>
      </div>

      <CustomerDialog open={open} setOpen={setOpen} editing={editing} setEditing={setEditing} />
    </PageTransition>
  );
}

function CustomerDialog({
  open, setOpen, editing, setEditing,
}: { open: boolean; setOpen: (v: boolean) => void; editing: Customer | null; setEditing: (c: Customer | null) => void }) {
  const upsertCustomer = useUpsertCustomer();
  const { t } = useTranslation("common");
  if (!editing) return null;
  const update = (patch: Partial<Customer>) => setEditing({ ...editing, ...patch });
  const save = () => {
    if (!editing.name.trim()) return toast.error(t("customers.name_required", { defaultValue: "Name is required" }));
    upsertCustomer.mutate(editing, {
      onSuccess: () => { toast.success(t("customers.updated")); setOpen(false); },
    });
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
