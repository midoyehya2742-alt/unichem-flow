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
import { Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Role, User } from "@/lib/types";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><UsersPage /></RequireAuth>,
});

function UsersPage() {
  const db = useDb();
  const list = db.listUsers();
  const [editing, setEditing] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ id: newId(), email: "", name: "", role: "salesman", active: true, createdAt: nowIso() });
    setPassword(""); setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.email.trim() || !editing.name.trim()) return toast.error("Name & email required");
    db.upsertUser(editing, password || undefined);
    toast.success("Saved");
    setOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Users" description="Manage team members & roles."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New User</Button>} />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{u.role}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge variant={u.active ? "default" : "outline"}>{u.active ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setPassword(""); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { db.deleteUser(u.id); toast.success("Removed"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
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
            <DialogHeader><DialogTitle>{editing.name ? "Edit user" : "New user"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="Name *"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Email *"><Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Role">
                <Select value={editing.role} onValueChange={(v: Role) => setEditing({ ...editing, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="salesman">Salesman</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Password (leave blank to keep)"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              <div className="flex items-center gap-2">
                <input id="active" type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
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
