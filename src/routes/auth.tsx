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
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Full name is required"); return; }
    if (!email.trim()) { toast.error("Email address is required"); return; }
    if (!password) { toast.error("Password is required"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match — please re-enter"); return; }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
          },
        },
      });

      if (error) {
        toast.error(error.message || "Registration failed. Please try again.");
        return;
      }

      if (data?.user) {
        toast.success("Account created! You can now sign in.", { duration: 5000 });
        setActiveTab("signin");
        setPassword("");
        setConfirmPassword("");
        setName("");
        setPhone("");
      }
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please contact your administrator.");
    } finally {
      setBusy(false);
    }
  };

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
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(234,179,8,0.05),transparent_40%)]" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="grid place-items-center h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md text-yellow-500">
            <Beaker className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">UniChem</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Enterprise Unified Platform</div>
          </div>
        </div>

        <div className="space-y-6 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-yellow-500">
            <ShieldCheck className="h-3.5 w-3.5" /> High-Performance Internal ERP
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            Integrated Command for Sales, Inventory &amp; Finance
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            Eliminate silos, automate tracking, and authorize transactions in one centralized interface. Log in to your corporate portal to manage chemical portfolios, inventory audits, and deal workflows.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800">
            <div>
              <div className="text-2xl font-bold text-white">EGP 0.00</div>
              <div className="text-xs text-slate-400">Total Cleared Sales</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-400">Real-time Stock Audits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Role-Based</div>
              <div className="text-xs text-slate-400">Enforced Security</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 relative z-10 flex items-center justify-between">
          <span>© {new Date().getFullYear()} UniChem Co. All rights reserved.</span>
          <span>System Version v2.1.0-prod</span>
        </div>
      </div>

      {/* ── Auth Form Panel ── */}
      <div className="lg:col-span-5 xl:col-span-4 flex items-center justify-center p-6 sm:p-12 md:bg-white dark:md:bg-slate-900 border-l border-slate-100 dark:border-slate-800">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-6">
            <div className="grid place-items-center h-10 w-10 rounded-lg bg-indigo-600 text-yellow-500">
              <Beaker className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl dark:text-white">UniChem ERP</span>
          </div>

          <Card className="border-0 shadow-none md:shadow-lg md:border dark:bg-slate-900/50">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeTab === "signin" && "Welcome back"}
                {activeTab === "signup" && "Create account"}
                {activeTab === "forgot" && "Reset password"}
                {activeTab === "reset" && "Set new password"}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {activeTab === "signin" && "Sign in to access your dashboard"}
                {activeTab === "signup" && "Register as a company employee"}
                {activeTab === "forgot" && "We'll email you a secure recovery link"}
                {activeTab === "reset" && "Enter a new password for your account"}
              </CardDescription>
            </CardHeader>

            <CardContent>
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

              {/* ── Sign In / Sign Up Tabs ── */}
              {(activeTab === "signin" || activeTab === "signup") && (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-2 mb-6">
                    <TabsTrigger value="signin" className="flex items-center gap-2">
                      <LogIn className="h-3.5 w-3.5" /> Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5" /> Sign Up
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Sign In Tab ── */}
                  <TabsContent value="signin">
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
                  </TabsContent>

                  {/* ── Sign Up Tab ── */}
                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Work Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@unichem.local"
                          className="h-11"
                          autoComplete="email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Phone Number <span className="text-slate-400 font-normal">(Optional)</span></Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+20 123 456 7890"
                          className="h-11"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-11 pr-10"
                              autoComplete="new-password"
                            />
                            <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-confirm">Confirm</Label>
                          <div className="relative">
                            <Input
                              id="signup-confirm"
                              type={showConfirm ? "text" : "password"}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="h-11 pr-10"
                              autoComplete="new-password"
                            />
                            <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <Button type="submit" disabled={busy} className="w-full h-11 mt-2">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                        Register Employee
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
