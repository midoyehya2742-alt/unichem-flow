import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Beaker, Loader2, KeyRound, UserPlus, LogIn, Mail, ArrowRight, ShieldCheck,
  Eye, EyeOff, CheckCircle2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Access Gate — UniChem ERP" }] }),
  component: AuthPage,
});

type TabMode = "signin" | "signup" | "forgot" | "reset";

function AuthPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  // ─── Sign In ────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Email address is required"); return; }
    if (!password) { toast.error("Password is required"); return; }
    setBusy(true);
    try {
      const r = await login(email.trim().toLowerCase(), password);
      if (!r.ok) {
        toast.error(r.error ?? "Invalid email or password. Please try again.");
        return;
      }
      toast.success("Welcome back! Redirecting to dashboard…");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ─── Sign Up ────────────────────────────────────────────────────
  // Removed sign up logic

  // ─── Forgot Password ────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email address"); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth#type=recovery`,
      });

      if (error) {
        toast.error(error.message || "Failed to send reset email. Please try again.");
        return;
      }

      setForgotSent(true);
      toast.success("Password reset link sent! Check your inbox.", { duration: 6000 });
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email.");
    } finally {
      setBusy(false);
    }
  };

  // ─── Reset Password (from email link) ──────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error("New password is required"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Failed to update password. Please request a new reset link.");
        return;
      }
      setResetSuccess(true);
      toast.success("Password updated successfully! You can now sign in.", { duration: 5000 });
      setTimeout(() => {
        setActiveTab("signin");
        window.history.replaceState({}, "", "/auth");
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Password reset failed.");
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
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Secure Corporate Network
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
              Enterprise Operations Portal
            </h2>
            <p className="text-xl font-medium text-slate-300 drop-shadow-md tracking-wide">
              Centralized management for UniChem's supply chain, finance, and commercial operations.
            </p>
          </div>
          
          <p className="text-slate-400 text-base leading-relaxed font-light">
            Please authenticate with your corporate credentials to access the secure internal network. 
            This system contains confidential business information. Unauthorized access or distribution 
            of data is strictly prohibited and monitored.
          </p>
          
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
            <div>
              <div className="text-lg font-semibold text-white tracking-tight drop-shadow-sm">Sales & CRM</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Module Active</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white tracking-tight drop-shadow-sm">Inventory & Logistics</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Module Active</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white tracking-tight drop-shadow-sm">Finance & Audit</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Module Active</div>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-400 relative z-10 flex items-center justify-between font-medium">
          <span>© {new Date().getFullYear()} UniChem Co. All rights reserved.</span>
          <span>System Version v2.1.0-prod</span>
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
                {activeTab === "signin" && "Welcome back"}
                {activeTab === "forgot" && "Reset password"}
                {activeTab === "reset" && "Set new password"}
              </CardTitle>
              <CardDescription className="text-base text-slate-500 dark:text-slate-400 font-medium">
                {activeTab === "signin" && "Sign in to your account to continue"}
                {activeTab === "forgot" && "We'll email you a secure recovery link"}
                {activeTab === "reset" && "Enter a new password for your account"}
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
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">Check your email</p>
                      <p className="text-xs text-slate-500">A password reset link was sent to <strong>{email}</strong>. Check your inbox and spam folder.</p>
                      <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={() => { setForgotSent(false); setEmail(""); }}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Send again
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Work Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="forgot-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@unichem.local"
                            className="pl-10 h-11"
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={busy} className="w-full h-11">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        Send recovery link
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setActiveTab("signin"); setForgotSent(false); }}
                    className="w-full text-xs text-indigo-500 hover:text-indigo-600"
                  >
                    ← Back to Sign In
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
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">Password updated!</p>
                      <p className="text-xs text-slate-500">Redirecting to sign in…</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="h-11 pr-10"
                          />
                          <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-new-password"
                            type={showConfirm ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className="h-11 pr-10"
                          />
                          <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" disabled={busy} className="w-full h-11">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        Update Password
                      </Button>
                    </>
                  )}
                </form>
              )}

              {/* ── Sign In Form ── */}
              {activeTab === "signin" && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Work Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@unichem.local"
                        className="pl-10 h-11"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("forgot")}
                        className="text-xs text-indigo-500 hover:text-indigo-600 transition"
                      >
                        Forgot password?
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
                    Access Console
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
