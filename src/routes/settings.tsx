import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useSettings, useUpdateSettings } from "@/hooks/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Settings, Save, ShieldAlert, ImagePlus, Trash2, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/ui/page-transition";
import { useTheme } from "@/lib/theme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><SettingsPage /></RequireAuth>,
});

function SettingsPage() {
  const { data: s, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { t, i18n } = useTranslation("common");
  const { theme, setTheme } = useTheme();
  const [companyName, setCompanyName] = useState("");
  const [defaultTax, setDefaultTax] = useState(0);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!s) return;
    setCompanyName(s.companyName);
    setDefaultTax(s.defaultTax);
    setLogoDataUrl(s.logoDataUrl);
  }, [s]);

  const [dateFormat, setDateFormat] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unichem-date-format") || "default";
    }
    return "default";
  });

  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unichem-timezone") || "local";
    }
    return "local";
  });

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
    localStorage.setItem("unichem-date-format", dateFormat);
    localStorage.setItem("unichem-timezone", timezone);
    window.dispatchEvent(new Event("unichem-preferences-updated"));
    updateSettings.mutate({ ...s!, companyName, defaultTax, logoDataUrl }, {
      onSuccess: () => toast.success(t("settings.updated")),
    });
  };

  if (isLoading || !s) {
    return <div className="p-8 text-center text-slate-500">{t("common.loading", { defaultValue: "Loading..." })}</div>;
  }

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
              <Input type="number" min={0} max={100} value={defaultTax === 0 ? "" : defaultTax} onChange={(e) => setDefaultTax(parseFloat(e.target.value) || 0)} className="h-10 text-xs" />
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

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">{t("settings.system_pref", { defaultValue: "System & UI Preferences" })}</CardTitle>
            <CardDescription className="text-xs">{t("settings.system_pref_desc", { defaultValue: "Customize interface theme, language, date formats, and timezone settings." })}</CardDescription>
          </div>
          <Globe className="h-4.5 w-4.5 text-slate-400" />
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="space-y-1.5">
              <Label className="text-slate-500">{t("settings.language", { defaultValue: "Language" })}</Label>
              <Select value={i18n.language} onValueChange={(val) => {
                i18n.changeLanguage(val);
                const dir = val === "ar" ? "rtl" : "ltr";
                document.documentElement.dir = dir;
                document.documentElement.lang = val;
              }}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (EN)</SelectItem>
                  <SelectItem value="ar">العربية (AR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme Selection */}
            <div className="space-y-1.5">
              <Label className="text-slate-500">{t("settings.theme", { defaultValue: "Interface Theme" })}</Label>
              <Select value={theme} onValueChange={(val: "light" | "dark") => setTheme(val)}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("settings.theme_light", { defaultValue: "Light Mode" })}</SelectItem>
                  <SelectItem value="dark">{t("settings.theme_dark", { defaultValue: "Dark Mode" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Format Selection */}
            <div className="space-y-1.5">
              <Label className="text-slate-500">{t("settings.date_format", { defaultValue: "Date Format" })}</Label>
              <Select value={dateFormat} onValueChange={(val) => {
                setDateFormat(val);
                localStorage.setItem("unichem-date-format", val);
                window.dispatchEvent(new Event("unichem-preferences-updated"));
              }}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("settings.date_format_default", { defaultValue: "Default (4 Jul 2026)" })}</SelectItem>
                  <SelectItem value="numeric">{t("settings.date_format_numeric", { defaultValue: "Numeric (04/07/2026)" })}</SelectItem>
                  <SelectItem value="iso">{t("settings.date_format_iso", { defaultValue: "ISO Standard (2026-07-04)" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timezone Selection */}
            <div className="space-y-1.5">
              <Label className="text-slate-500">{t("settings.timezone", { defaultValue: "System Timezone" })}</Label>
              <Select value={timezone} onValueChange={(val) => {
                setTimezone(val);
                localStorage.setItem("unichem-timezone", val);
                window.dispatchEvent(new Event("unichem-preferences-updated"));
              }}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">{t("settings.timezone_local", { defaultValue: "Browser Local Time" })}</SelectItem>
                  <SelectItem value="Asia/Riyadh">{t("settings.timezone_riyadh", { defaultValue: "Riyadh, KSA (AST, UTC+3)" })}</SelectItem>
                  <SelectItem value="UTC">{t("settings.timezone_utc", { defaultValue: "Coordinated Universal Time (UTC)" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
