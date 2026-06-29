import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, BarChart3, Wallet, FileSpreadsheet, Percent, AreaChart as ChartIcon } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { formatEGP, formatDate } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><ReportsPage /></RequireAuth>,
});

type Range = "7d" | "30d" | "90d" | "ytd";

function ReportsPage() {
  const db = useDb();
  const deals = db.listDeals();
  const { t } = useTranslation("common");
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    if (range === "7d") from.setDate(now.getDate() - 7);
    else if (range === "30d") from.setDate(now.getDate() - 30);
    else if (range === "90d") from.setDate(now.getDate() - 90);
    else from.setMonth(0, 1);
    return deals.filter((d) => new Date(d.dealDate) >= from);
  }, [deals, range]);

  const total = filtered.reduce((s, d) => s + d.total, 0);
  const paid = filtered.reduce((s, d) => s + d.amountPaid, 0);
  const collectionsRate = total > 0 ? (paid / total) * 100 : 0;

  const bySalesman = Object.values(filtered.reduce<Record<string, { name: string; total: number; count: number }>>((acc, d) => {
    acc[d.salesmanId] = acc[d.salesmanId] || { name: d.salesmanName, total: 0, count: 0 };
    acc[d.salesmanId].total += d.total; acc[d.salesmanId].count += 1; return acc;
  }, {})).sort((a, b) => b.total - a.total);

  const byProduct = Object.values(filtered.flatMap((d) => d.lines).reduce<Record<string, { name: string; qty: number; revenue: number }>>((acc, l) => {
    acc[l.productId] = acc[l.productId] || { name: l.productName, qty: 0, revenue: 0 };
    acc[l.productId].qty += l.quantity;
    acc[l.productId].revenue += l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100);
    return acc;
  }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.warning(t("reports.no_records_export"));
      return;
    }
    const rows = [
      ["Reference", "Date", "Customer", "Salesman", "Total", "Paid", "Status"],
      ...filtered.map((d) => [d.reference, formatDate(d.dealDate), d.customerName, d.salesmanName, d.total, d.amountPaid, d.paymentStatus]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `unichem-report-${range}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(t("reports.export_success"));
  };

  const COLORS = ["#4f46e5", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("reports.title")}
        description={t("reports.desc")}
        actions={
          <div className="flex gap-2 shrink-0">
            <Select value={range} onValueChange={(v: Range) => setRange(v)}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t("reports.last_7d")}</SelectItem>
                <SelectItem value="30d">{t("reports.last_30d")}</SelectItem>
                <SelectItem value="90d">{t("reports.last_90d")}</SelectItem>
                <SelectItem value="ytd">{t("reports.ytd")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-9 text-xs">
              <Download className="h-3.5 w-3.5 me-2 text-slate-500" /> {t("reports.export_csv")}
            </Button>
          </div>
        }
      />

      {/* Stats Cards Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileSpreadsheet} label={t("reports.total_transactions")} value={String(filtered.length)} sub={t("reports.active_pipeline_count")} tone="primary" />
        <StatCard icon={TrendingUp} label={t("reports.gross_billing")} value={formatEGP(total)} sub={t("reports.sum_invoices")} tone="primary" />
        <StatCard icon={Percent} label={t("reports.clearance_rate")} value={`${collectionsRate.toFixed(1)}%`} sub={t("reports.collected_vs_gross")} tone="success" />
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
          <Card className="h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
              <ChartIcon className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("reports.insufficient_data_title")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {t("reports.insufficient_data_desc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Salesmen Bar Chart */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">{t("reports.top_sales_agents")}</CardTitle>
              <CardDescription className="text-xs">{t("reports.sales_agents_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {bySalesman.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">{t("reports.no_sales_active")}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bySalesman}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [formatEGP(v), t("reports.revenue")]} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {bySalesman.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Products Bar Chart */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">{t("reports.top_products")}</CardTitle>
              <CardDescription className="text-xs">{t("reports.products_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {byProduct.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">{t("reports.no_product_sales")}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byProduct} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [formatEGP(v), t("reports.gross_revenue")]} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {byProduct.map((_, index) => <Cell key={index} fill={COLORS[(index + 3) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, tone = "primary"
}: { icon: any; label: string; value: string; sub?: string; tone?: "primary" | "success" }) {
  const toneCls = {
    primary: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
  }[tone];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition">
      <CardContent className="p-5 flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
          <div className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">{value}</div>
          {sub && <div className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</div>}
        </div>
        <div className={cn("h-10 w-10 rounded-xl grid place-items-center border shadow-sm", toneCls)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
