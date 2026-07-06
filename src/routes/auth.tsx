import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Loader2, KeyRound, Mail, ArrowRight, ShieldCheck,
  Eye, EyeOff, CheckCircle2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Access Gate — UniChem ERP" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  component: AuthPage,
});

type TabMode = "signin" | "signup" | "forgot" | "reset";

function AuthPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { t } = useTranslation("common");

  const [activeTab, setActiveTab] = useState<TabMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Detect password-reset callback from Supabase email link
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=email_change")) {
      setActiveTab("reset");
    }
  }, []);

  // Redirect authenticated users (honor ?next=)
  useEffect(() => {
    if (user) {
      navigate({ to: next ?? "/dashboard", replace: true });
    }
  }, [user, navigate, next]);

  // ─── Sign In ────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error(t("auth.email_required")); return; }
    if (!password) { toast.error(t("auth.password_required")); return; }
    setBusy(true);
    try {
      const r = await login(email.trim().toLowerCase(), password);
      if (!r.ok) {
        toast.error(r.error ?? t("auth.invalid_credentials"));
        return;
      }
      toast.success(t("auth.welcome_redirect"));
      navigate({ to: next ?? "/dashboard", replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("root.something_went_wrong"));
    } finally {
      setBusy(false);
    }
  };

  // ─── Forgot Password ────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error(t("auth.email_required")); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth#type=recovery`,
      });

      if (error) {
        toast.error(error.message || t("root.something_went_wrong"));
        return;
      }

      setForgotSent(true);
      toast.success(t("auth.reset_link_success"), { duration: 6000 });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("root.something_went_wrong"));
    } finally {
      setBusy(false);
    }
  };

  // ─── Reset Password (from email link) ──────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error(t("auth.password_required")); return; }
    if (password.length < 8) { toast.error(t("auth.password_min_length")); return; }
    if (password !== confirmPassword) { toast.error(t("auth.passwords_no_match")); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || t("root.something_went_wrong"));
        return;
      }
      setResetSuccess(true);
      toast.success(t("auth.password_update_success"), { duration: 5000 });
      setTimeout(() => {
        setActiveTab("signin");
        window.history.replaceState({}, "", "/auth");
      }, 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("root.something_went_wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* ── Brand Panel ── */}
      <div 
        className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col justify-between p-12 text-white relative overflow-hidden bg-slate-950"
        style={{
          backgroundImage: 'url("/login-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 to-transparent mix-blend-overlay" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white p-3.5 rounded-2xl shadow-2xl inline-block ring-1 ring-white/20">
            <img src="/logo-full.png" alt="UniChem" className="h-14 w-auto object-contain" />
          </div>
        </div>

        <div className="space-y-8 max-w-2xl relative z-10 bg-slate-900/40 p-10 rounded-[2rem] backdrop-blur-xl border border-white/10 shadow-2xl ring-1 ring-white/5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-600/50 text-sm font-medium text-slate-300 shadow-sm backdrop-blur-md tracking-wide">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> {t("auth.secure_network")}
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
              {t("auth.portal_title")}
            </h2>
            <p className="text-xl font-medium text-slate-300 drop-shadow-md tracking-wide">
              {t("auth.portal_desc")}
            </p>
          </div>
          
          <p className="text-slate-400 text-base leading-relaxed font-light">
            {t("auth.portal_warning")}
          </p>
          
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
            <div>
              <div className="text-lg font-semibold text-white tracking-tight drop-shadow-sm">{t("auth.module_sales")}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{t("auth.module_active")}</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white tracking-tight drop-shadow-sm">{t("auth.module_inventory")}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{t("auth.module_active")}</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white tracking-tight drop-shadow-sm">{t("auth.module_finance")}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{t("auth.module_active")}</div>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-400 relative z-10 flex items-center justify-between font-medium">
          <span>{t("auth.copyright", { year: new Date().getFullYear() })}</span>
          <span>{t("auth.version")}</span>
        </div>
      </div>

      {/* ── Auth Form Panel ── */}
      <div className="lg:col-span-5 xl:col-span-4 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.04),transparent_50%)]" />
        
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 inline-block">
              <img src="/logo-full.png" alt="UniChem" className="h-12 w-auto object-contain" />
            </div>
          </div>

          <Card className="border-0 shadow-none md:shadow-2xl md:shadow-slate-200/50 dark:md:shadow-none md:border md:border-slate-200/60 dark:md:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="space-y-2 pb-6 px-6 sm:px-8 pt-8">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeTab === "signin" && t("auth.welcome_back")}
                {activeTab === "forgot" && t("auth.reset_password")}
                {activeTab === "reset" && t("auth.set_new_password")}
              </CardTitle>
              <CardDescription className="text-base text-slate-500 dark:text-slate-400 font-medium">
                {activeTab === "signin" && t("auth.sign_in_desc")}
                {activeTab === "forgot" && t("auth.recovery_desc")}
                {activeTab === "reset" && t("auth.new_password_desc")}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-8">
              {/* ── Forgot Password Form ── */}
              {activeTab === "forgot" && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotSent ? (
                    <div className="flex flex-col items-center py-6 gap-3 text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center text-emerald-600">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("auth.check_email")}</p>
                      <p className="text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: t("auth.reset_link_sent", { email: `<strong>${email}</strong>` }) }} />
                      <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={() => { setForgotSent(false); setEmail(""); }}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> {t("auth.send_again")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">{t("auth.work_email")}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="forgot-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("auth.placeholder_email")}
                            className="pl-10 h-11"
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={busy} className="w-full h-11">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        {t("auth.send_recovery_link")}
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setActiveTab("signin"); setForgotSent(false); }}
                    className="w-full text-xs text-indigo-500 hover:text-indigo-600"
                  >
                    {t("auth.back_to_sign_in")}
                  </Button>
                </form>
              )}

              {/* ── Reset Password Form (from email link) ── */}
              {activeTab === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {resetSuccess ? (
                    <div className="flex flex-col items-center py-6 gap-3 text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center text-emerald-600">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("auth.password_updated")}</p>
                      <p className="text-xs text-slate-500">{t("auth.redirecting_signin")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">{t("auth.new_password")}</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("auth.placeholder_password")}
                            className="h-11 pr-10"
                          />
                          <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">{t("auth.confirm_password")}</Label>
                        <div className="relative">
                          <Input
                            id="confirm-new-password"
                            type={showConfirm ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("auth.placeholder_confirm")}
                            className="h-11 pr-10"
                          />
                          <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" disabled={busy} className="w-full h-11">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        {t("auth.update_password")}
                      </Button>
                    </>
                  )}
                </form>
              )}

              {/* ── Sign In Form ── */}
              {activeTab === "signin" && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t("auth.work_email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("auth.placeholder_email")}
                        className="pl-10 h-11"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">{t("auth.password")}</Label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("forgot")}
                        className="text-xs text-indigo-500 hover:text-indigo-600 transition"
                      >
                        {t("auth.forgot_password")}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pr-10"
                        autoComplete="current-password"
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={busy} className="w-full h-11">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    {t("auth.access_console")}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
