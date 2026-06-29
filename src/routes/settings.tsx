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
import { Settings, Save, ShieldAlert, BadgeDollarSign } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><SettingsPage /></RequireAuth>,
});

function SettingsPage() {
  const db = useDb();
  const s = db.getSettings();
  const [companyName, setCompanyName] = useState(s.companyName);
  const [defaultTax, setDefaultTax] = useState(s.defaultTax);

  const save = () => {
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    db.updateSettings({ ...s, companyName, defaultTax });
    toast.success("Company configuration updated successfully");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="System Settings"
        description="Configure corporate profiles, default tax rates, and system-wide options."
      />

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Company Preferences</CardTitle>
            <CardDescription className="text-xs">Adjust defaults used for deal calculations.</CardDescription>
          </div>
          <Settings className="h-4.5 w-4.5 text-slate-400" />
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-slate-500">Company Name *</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10 text-xs" />
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-500">Default Value-Added Tax (VAT %)</Label>
              <Input type="number" min={0} max={100} value={defaultTax} onChange={(e) => setDefaultTax(parseFloat(e.target.value) || 0)} className="h-10 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-500">Corporate Base Currency</Label>
              <Input value="EGP (Egyptian Pound)" disabled className="h-10 text-xs bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button size="sm" onClick={save} className="h-9 text-xs">
              <Save className="h-3.5 w-3.5 mr-2" /> Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-500/20 dark:border-rose-950 bg-rose-500/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" /> System Governance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Settings configured on this screen affect tax estimates and title configurations for all connected active users immediately. Modify parameters with care.
        </CardContent>
      </Card>
    </div>
  );
}
