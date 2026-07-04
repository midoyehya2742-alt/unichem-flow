import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { newId, nowIso, useDb } from "@/lib/store";
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from "@/components/ui/glow-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, ShieldCheck, UserX, Loader2, Users, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageTransition } from "@/components/ui/page-transition";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><UsersPage /></RequireAuth>,
});

function UsersPage() {
  const db = useDb();
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(true);
  const list = db.listUsers();
  const [editing, setEditing] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const filtered = useMemo(() => {
    return list.filter(u => 
      !q || 
      u.name.toLowerCase().includes(q.toLowerCase()) || 
      u.email.toLowerCase().includes(q.toLowerCase())
    );
  }, [list, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const openNew = () => {
    setEditing({ id: newId(), email: "", name: "", role: "salesman", active: true, createdAt: nowIso() });
    setPassword("");
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.email.trim() || !editing.name.trim()) return toast.error(t("users.err_name_email"));
    const creation = db.upsertUser(editing, password || undefined);
    if (creation) {
      setSaving(true);
      try {
        await creation;
        toast.success(t("users.created"));
        setOpen(false);
      } catch (err: any) {
        toast.error(err.message || t("users.create_failed"));
      } finally {
        setSaving(false);
      }
    } else {
      toast.success(t("users.updated"));
      setOpen(false);
    }
  };

  const totalUsers = list.length;
  const activeUsers = list.filter(u => u.active).length;
  const adminUsers = list.filter(u => u.role === "admin").length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("users.title")}
        description={t("users.desc")}
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs shadow-md shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"><Plus className="h-3.5 w-3.5 me-2" />{t("users.new_user")}</Button>}
      />

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid gap-4 sm:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Users}
            label={t("users.total_personnel", { defaultValue: "Total Personnel" })}
            value={String(totalUsers)}
            numericValue={totalUsers}
            formatter={(n) => String(Math.round(n))}
            sub={t("users.registered_accounts", { defaultValue: "Registered accounts" })}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={ShieldCheck}
            label={t("users.sys_admins", { defaultValue: "System Administrators" })}
            value={String(adminUsers)}
            numericValue={adminUsers}
            formatter={(n) => String(Math.round(n))}
            sub={t("users.full_access", { defaultValue: "Full access" })}
            tone="success"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={UserX}
            label={t("users.revoked_access", { defaultValue: "Revoked Access" })}
            value={String(totalUsers - activeUsers)}
            numericValue={totalUsers - activeUsers}
            formatter={(n) => String(Math.round(n))}
            sub={t("users.inactive_accounts", { defaultValue: "Inactive accounts" })}
            tone="warning"
          />
        </motion.div>
      </motion.div>

      {loading ? (
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
          <GlowCardContent className="p-4">
            <TableSkeleton columns={5} rows={5} />
          </GlowCardContent>
        </GlowCard>
      ) : filtered.length === 0 && !q ? (
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
          <GlowCardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
              <UserX className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("users.no_users")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {t("users.no_users_desc")}
            </p>
            <Button size="sm" onClick={openNew} className="mt-4 shadow-sm shadow-indigo-600/10">
              <Plus className="h-4 w-4 me-2" /> {t("users.add_first")}
            </Button>
          </GlowCardContent>
        </GlowCard>
      ) : (
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
            <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("users.personnel_directory", { defaultValue: "Personnel Directory" })}</GlowCardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  className="ps-9 h-9 text-xs focus-visible:ring-indigo-500 placeholder-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" 
                  placeholder={t("users.search_placeholder", { defaultValue: "Search personnel..." })} 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)} 
                />
              </div>
            </GlowCardHeader>
            <GlowCardContent className="p-0 overflow-x-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
                    <UserX className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("users.no_users_found", { defaultValue: "No personnel found" })}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    {t("users.no_search_results", { defaultValue: "No users match your search query." })}
                  </p>
                </div>
              ) : (
                <>
                  <table className="w-full text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr className="text-start font-semibold">
                    <th className="px-5 py-3.5 text-start">{t("users.name")}</th>
                    <th className="px-5 py-3.5 text-start">{t("users.email")}</th>
                    <th className="px-5 py-3.5 text-start">{t("users.role_mapping")}</th>
                    <th className="px-5 py-3.5 text-start">{t("users.security_status")}</th>
                    <th className="px-5 py-3.5 text-end w-32">{t("users.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{u.name}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "capitalize text-[10px] px-2 py-0.5",
                            u.role === "admin" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border-transparent",
                            u.role === "finance" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-transparent",
                            u.role === "salesman" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-transparent"
                          )}
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={u.active ? "default" : "outline"} className={cn(
                          "text-[10px] px-2", 
                          u.active ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"
                        )}>
                          {u.active ? t("users.active_access") : t("users.revoked")}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setPassword(""); setOpen(true); }} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><Pencil className="h-3.5 w-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("users.delete_confirm_title", { defaultValue: "Are you sure?" })}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("users.delete_confirm_desc", { defaultValue: "This will permanently delete this user account. This action cannot be undone." })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.actions.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { db.deleteUser(u.id); toast.success(t("users.deleted")); }} className="bg-rose-500 hover:bg-rose-600 text-white">
                                  {t("common.actions.delete", { defaultValue: "Delete" })}
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="text-xs text-slate-500">
                    {t("common.showing", { defaultValue: "Showing" })} {paginated.length} {t("common.of", { defaultValue: "of" })} {filtered.length} {t("users.personnel_directory", { defaultValue: "Personnel" })}
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
              </>
            )}
            </GlowCardContent>
          </GlowCard>
        </motion.div>
      )}
      {editing && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md font-sans dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">{editing.name ? t("users.edit_title") : t("users.create_title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 py-2 text-xs">
              <Field label={t("users.name_req")}><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-9" /></Field>
              <Field label={t("users.email_req")}><Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="h-9" /></Field>
              <Field label={t("users.role_label")}>
                <Select value={editing.role} onValueChange={(v: Role) => setEditing({ ...editing, role: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("users.role_admin")}</SelectItem>
                    <SelectItem value="finance">{t("users.role_finance")}</SelectItem>
                    <SelectItem value="salesman">{t("users.role_salesman")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("users.password_label")}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9" /></Field>
              <div className="flex items-center gap-2.5 pt-2 cursor-pointer">
                <input id="active" type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="h-4 w-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500" />
                <Label htmlFor="active" className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("users.authorize")}</Label>
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>{t("common.actions.cancel")}</Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t("users.commit")}
              </Button>
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
