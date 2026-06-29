import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Settings, Save, ShieldAlert, ImagePlus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/ui/page-transition";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><SettingsPage /></RequireAuth>,
});

function SettingsPage() {
  const db = useDb();
  const { t } = useTranslation("common");
  const s = db.getSettings();
  const [companyName, setCompanyName] = useState(s.companyName);
  const [defaultTax, setDefaultTax] = useState(s.defaultTax);
  const [logoDataUrl, setLogoDataUrl] = useState(s.logoDataUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error(t("settings.logo_size_error")); return; }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!companyName.trim()) {
      toast.error(t("settings.company_req"));
      return;
    }
    db.updateSettings({ ...s, companyName, defaultTax, logoDataUrl });
    toast.success(t("settings.updated"));
  };

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.desc")}
      />

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">{t("settings.company_pref")}</CardTitle>
            <CardDescription className="text-xs">{t("settings.company_pref_desc")}</CardDescription>
          </div>
          <Settings className="h-4.5 w-4.5 text-slate-400" />
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-slate-500">{t("settings.company_name")}</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10 text-xs" />
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-500">{t("settings.vat")}</Label>
              <Input type="number" min={0} max={100} value={defaultTax} onChange={(e) => setDefaultTax(parseFloat(e.target.value) || 0)} className="h-10 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-500">{t("settings.currency")}</Label>
              <Input value={t("settings.currency_egp")} disabled className="h-10 text-xs bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button size="sm" onClick={save} className="h-9 text-xs">
              <Save className="h-3.5 w-3.5 me-2" /> {t("settings.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">{t("settings.company_logo")}</CardTitle>
            <CardDescription className="text-xs">{t("settings.logo_desc")}</CardDescription>
          </div>
          <ImagePlus className="h-4.5 w-4.5 text-slate-400" />
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {logoDataUrl ? (
            <div className="flex items-center gap-4">
              <img src={logoDataUrl} alt="Company logo" className="h-16 w-auto max-w-[160px] object-contain rounded border border-slate-200 dark:border-slate-700 p-1 bg-white" />
              <Button size="sm" variant="outline" className="text-rose-500 border-rose-200 hover:bg-rose-50 h-8 text-xs" onClick={() => { setLogoDataUrl(undefined); if (fileRef.current) fileRef.current.value = ""; }}>
                <Trash2 className="h-3.5 w-3.5 me-1.5" /> {t("settings.remove")}
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-400">
              {t("settings.no_logo")}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoChange} />
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5 me-2" /> {logoDataUrl ? t("settings.replace_logo") : t("settings.upload_logo")}
          </Button>
          <p className="text-[11px] text-slate-400">{t("settings.logo_hint")}</p>
        </CardContent>
      </Card>

      <Card className="border-rose-500/20 dark:border-rose-950 bg-rose-500/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" /> {t("settings.governance")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {t("settings.gov_desc")}
        </CardContent>
      </Card>
    </PageTransition>
  );
}
