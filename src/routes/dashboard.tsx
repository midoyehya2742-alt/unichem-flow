import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatEGP, formatNumber } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Plus, TrendingUp, Wallet, FileText, Clock, CheckCircle2, AlertTriangle, Users,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UniChem ERP" }] }),
  component: () => <RequireAuth><Dashboard /></RequireAuth>,
});

function Dashboard() {
  const { user } = useAuth();
  const db = useDb();
  const deals = db.listDeals();
  const myDeals = user?.role === "salesman" ? deals.filter((d) => d.salesmanId === user.id) : deals;

  const total = myDeals.reduce((s, d) => s + d.total, 0);
  const paid = myDeals.reduce((s, d) => s + d.amountPaid, 0);
  const outstanding = total - paid;
  const pending = myDeals.filter((d) => d.paymentStatus !== "paid").length;

  // chart data
  const byStatus = ["paid", "partial", "unpaid"].map((s) => ({
    name: s, value: myDeals.filter((d) => d.paymentStatus === s).length,
  }));
  const COLORS = ["var(--color-success)", "var(--color-warning)", "var(--color-destructive)"];

  const bySalesman = Object.values(
    myDeals.reduce<Record<string, { name: string; total: number }>>((acc, d) => {
      acc[d.salesmanId] = acc[d.salesmanId] || { name: d.salesmanName, total: 0 };
      acc[d.salesmanId].total += d.total;
      return acc;
    }, {}),
  );

  // last 7 days line
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const sum = myDeals.filter((x) => x.dealDate.slice(0, 10) === key).reduce((s, x) => s + x.total, 0);
    return { day: d.toLocaleDateString("en", { weekday: "short" }), total: sum };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Welcome, ${user?.name.split(" ")[0]}`}
        description={
          user?.role === "salesman" ? "Your sales activity at a glance."
            : user?.role === "finance" ? "Finance overview across all deals."
              : "Company-wide ERP overview."
        }
        actions={
          (user?.role === "salesman" || user?.role === "admin") && (
            <Link to="/deals/new"><Button><Plus className="h-4 w-4 mr-2" />New Deal</Button></Link>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard icon={FileText} label="Total Deals" value={formatNumber(myDeals.length)} tone="primary" />
        <KpiCard icon={TrendingUp} label="Total Revenue" value={formatEGP(total)} tone="primary" />
        <KpiCard icon={Wallet} label="Collected" value={formatEGP(paid)} tone="success" />
        <KpiCard icon={Clock} label="Outstanding" value={formatEGP(outstanding)} sub={`${pending} open`} tone={outstanding > 0 ? "warning" : "muted"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — last 7 days</CardTitle>
            <CardDescription>Sum of deal totals (EGP)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => formatEGP(v)}
                />
                <Line type="monotone" dataKey="total" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status</CardTitle>
            <CardDescription>Deals by status</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {myDeals.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {(user?.role === "admin" || user?.role === "finance") && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Revenue by salesman</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {bySalesman.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bySalesman}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                      formatter={(v: number) => formatEGP(v)}
                    />
                    <Bar dataKey="total" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent deals</CardTitle>
            <CardDescription>Latest activity</CardDescription>
          </div>
          <Link to="/deals"><Button variant="outline" size="sm">View all</Button></Link>
        </CardHeader>
        <CardContent>
          {myDeals.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No deals yet.{" "}
              {(user?.role === "salesman" || user?.role === "admin") && (
                <Link to="/deals/new" className="text-primary hover:underline">Create the first one</Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {myDeals.slice(0, 6).map((d) => (
                <Link key={d.id} to="/deals/$id" params={{ id: d.id }} className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.reference} · {d.customerName}</div>
                    <div className="text-xs text-muted-foreground">By {d.salesmanName} · {new Date(d.dealDate).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-semibold">{formatEGP(d.total)}</div>
                    <StatusBadge status={d.paymentStatus} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, tone = "primary",
}: { icon: typeof FileText; label: string; value: string; sub?: string; tone?: "primary" | "success" | "warning" | "muted" }) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2; label: string }> = {
    paid: { variant: "default", icon: CheckCircle2, label: "Paid" },
    partial: { variant: "secondary", icon: AlertTriangle, label: "Partial" },
    unpaid: { variant: "destructive", icon: Clock, label: "Unpaid" },
  };
  const v = map[status] ?? map.unpaid;
  const Icon = v.icon;
  return (
    <Badge variant={v.variant} className="gap-1 text-[10px]">
      <Icon className="h-3 w-3" />{v.label}
    </Badge>
  );
}

function EmptyChart() {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground">No data yet</div>;
}
