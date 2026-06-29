import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beaker, Loader2, KeyRound, UserPlus, LogIn, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Access Gate — UniChem ERP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setBusy(true);
    try {
      const r = await login(email.trim(), password);
      if (!r.ok) {
        toast.error(r.error ?? "Invalid email or password");
        return;
      }
      toast.success("Welcome back to UniChem ERP");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !name.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

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
        toast.error(error.message);
        return;
      }

      if (data?.user) {
        toast.success("Registration successful! You can now sign in.");
        setActiveTab("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password reset instructions sent to your email!");
      setActiveTab("signin");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Visual Brand Panel */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        {/* Abstract Background Accents */}
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
            Integrated Command for Sales, Inventory & Finance
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

      {/* Access Gate Form Panel */}
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
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {activeTab === "signin" && "Sign in to access your dashboard"}
                {activeTab === "signup" && "Register as a company employee"}
                {activeTab === "forgot" && "Enter your email to reset your credentials"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {activeTab === "forgot" ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
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
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab("signin")}
                    className="w-full text-xs text-indigo-500 hover:text-indigo-600"
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-2 mb-6">
                    <TabsTrigger value="signin" className="flex items-center gap-2">
                      <LogIn className="h-3.5 w-3.5" /> Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5" /> Sign Up
                    </TabsTrigger>
                  </TabsList>

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
                        <Input
                          id="signin-password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11"
                        />
                      </div>

                      <Button type="submit" disabled={busy} className="w-full h-11">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                        Access Console
                      </Button>
                    </form>
                  </TabsContent>

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
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Phone Number (Optional)</Label>
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
                          <Input
                            id="signup-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-confirm">Confirm</Label>
                          <Input
                            id="signup-confirm"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-11"
                          />
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
