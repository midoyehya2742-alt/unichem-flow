import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, ShieldCheck, UserX } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><UsersPage /></RequireAuth>,
});

function UsersPage() {
  const db = useDb();
  const [loading, setLoading] = useState(true);
  const list = db.listUsers();
  const [editing, setEditing] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const openNew = () => {
    setEditing({ id: newId(), email: "", name: "", role: "salesman", active: true, createdAt: nowIso() });
    setPassword("");
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.email.trim() || !editing.name.trim()) return toast.error("Name & email required");
    db.upsertUser(editing, password || undefined);
    toast.success("User access configurations updated successfully");
    setOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Employee Directory"
        description="Provision accounts, assign system roles, and revoke platform access."
        actions={<Button size="sm" onClick={openNew} className="h-9 text-xs"><Plus className="h-4 w-4 mr-2" />New User</Button>}
      />

      {loading ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <div className="p-6 space-y-4">
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </Card>
      ) : list.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
              <UserX className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No users registered</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              There are currently no employee records registered.
            </p>
            <Button size="sm" onClick={openNew} className="mt-4">
              <Plus className="h-4 w-4 mr-2" /> Add First User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr className="text-left font-semibold">
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role Mapping</th>
                  <th className="px-5 py-3.5">Security Status</th>
                  <th className="px-5 py-3.5 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{u.name}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize text-[10px] px-2 py-0.5",
                          u.role === "admin" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                          u.role === "finance" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          u.role === "salesman" && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.active ? "default" : "outline"} className="text-[10px] px-2">
                        {u.active ? "Active Access" : "Revoked"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setPassword(""); setOpen(true); }} className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { db.deleteUser(u.id); toast.success("Access privileges deleted"); }} className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                          <Trash2 className="h-3.5 w-3.5" />
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

      {editing && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md font-sans dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">{editing.name ? "Edit employee credentials" : "Provision new access account"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 py-2 text-xs">
              <Field label="Name *"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-9" /></Field>
              <Field label="Email *"><Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="h-9" /></Field>
              <Field label="Role mapping">
                <Select value={editing.role} onValueChange={(v: Role) => setEditing({ ...editing, role: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">System Admin</SelectItem>
                    <SelectItem value="finance">Finance Specialist</SelectItem>
                    <SelectItem value="salesman">Sales Agent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Set Password (leave blank to retain current password)"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9" /></Field>
              <div className="flex items-center gap-2.5 pt-2 cursor-pointer">
                <input id="active" type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="h-4 w-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500" />
                <Label htmlFor="active" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Authorize active console access</Label>
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Commit provisioning</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-slate-500">{label}</Label>{children}</div>;
}
