import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Beaker, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — UniChem ERP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard", replace: true }); }, [user, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = login(email.trim(), password);
    setBusy(false);
    if (!r.ok) { toast.error(r.error ?? "Login failed"); return; }
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  };

  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-11 w-11 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Beaker className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-bold">UniChem</div>
            <div className="text-xs uppercase tracking-wider text-sidebar-foreground/60">Internal ERP</div>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-tight">
            One source of truth for Sales & Finance.
          </h2>
          <p className="text-sidebar-foreground/75 max-w-md">
            Replace paper, Excel, and WhatsApp. Submit a deal from your phone in under a minute —
            Finance and Admin see it instantly.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li>• Real-time deal tracking in EGP</li>
            <li>• Role-based dashboards for Sales, Finance, Admin</li>
            <li>• Searchable, exportable, audit-logged</li>
          </ul>
        </div>
        <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} UniChem. Internal use only.</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="lg:hidden flex items-center gap-2 mb-2">
              <div className="grid place-items-center h-9 w-9 rounded-lg bg-primary text-primary-foreground">
                <Beaker className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">UniChem ERP</span>
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Enter your work email and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@unichem.local" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Sign in
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Demo accounts</div>
              <div className="grid gap-1.5 text-xs">
                <button type="button" onClick={() => fill("midoyehya2742@gmail.com", "memo2742")} className="text-left px-3 py-2 rounded border hover:bg-accent hover:text-accent-foreground transition">
                  <span className="font-medium">Admin</span> — midoyehya2742@gmail.com / memo2742
                </button>
                <button type="button" onClick={() => fill("finance@unichem.local", "finance123")} className="text-left px-3 py-2 rounded border hover:bg-accent hover:text-accent-foreground transition">
                  <span className="font-medium">Finance</span> — finance@unichem.local / finance123
                </button>
                <button type="button" onClick={() => fill("sales@unichem.local", "sales123")} className="text-left px-3 py-2 rounded border hover:bg-accent hover:text-accent-foreground transition">
                  <span className="font-medium">Salesman</span> — sales@unichem.local / sales123
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
