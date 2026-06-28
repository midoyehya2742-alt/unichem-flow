import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { store } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><SettingsPage /></RequireAuth>,
});

function SettingsPage() {
  const db = useDb();
  const s = db.getSettings();
  const [companyName, setCompanyName] = useState(s.companyName);
  const [defaultTax, setDefaultTax] = useState(s.defaultTax);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <PageHeader title="Settings" description="Company-wide preferences." />
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Company</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>Company name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Default tax %</Label><Input type="number" min={0} max={100} value={defaultTax} onChange={(e) => setDefaultTax(parseFloat(e.target.value) || 0)} /></div>
            <div className="space-y-1.5"><Label>Currency</Label><Input value="EGP" disabled /></div>
            <Button onClick={() => { db.updateSettings({ ...s, companyName, defaultTax }); toast.success("Settings saved"); }}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>Wipe all local data and re-seed demo records.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => {
              if (!confirm("Reset all local data? This cannot be undone.")) return;
              store.reset(); toast.success("Data reset");
            }}>Reset local data</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
