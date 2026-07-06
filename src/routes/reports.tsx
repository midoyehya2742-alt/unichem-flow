import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDeals } from "@/hooks/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, BarChart3, Wallet, FileSpreadsheet, Percent, AreaChart as ChartIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEGP, formatDate, formatNumber, formatCompactEGP } from "@/lib/format";
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from "@/components/ui/glow-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  AreaChart, Area, Line, PieChart, Pie, Legend, ComposedChart
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance", "salesman"]}><ReportsPage /></RequireAuth>,
});

type Range = "7d" | "30d" | "90d" | "ytd";

function ReportsPage() {
  const { data: dealsData, isLoading: loading } = useDeals();
  const deals = dealsData ?? [];
  const { t } = useTranslation("common");
  const [range, setRange] = useState<Range>("30d");

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

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

  const trendData = useMemo(() => {
    const dailyMap: Record<string, { date: string; dateObj: Date; sales: number; collections: number }> = {};
    
    const sortedDeals = [...filtered].sort((a, b) => new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime());
    
    sortedDeals.forEach((d) => {
      const dateKey = d.dealDate.split("T")[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: formatDate(d.dealDate),
          dateObj: new Date(d.dealDate),
          sales: 0,
          collections: 0,
        };
      }
      dailyMap[dateKey].sales += d.total;
      dailyMap[dateKey].collections += d.amountPaid;
    });

    return Object.values(dailyMap).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [filtered]);

  const paymentStatusData = useMemo(() => {
    let paidCount = 0, partialCount = 0, unpaidCount = 0;
    let paidValue = 0, partialValue = 0, unpaidValue = 0;

    filtered.forEach((d) => {
      if (d.paymentStatus === "paid") {
        paidCount++;
        paidValue += d.total;
      } else if (d.paymentStatus === "partial") {
        partialCount++;
        partialValue += d.total;
      } else {
        unpaidCount++;
        unpaidValue += d.total;
      }
    });

    return [
      { name: t("common.status.paid", { defaultValue: "Paid" }), value: paidValue, count: paidCount, color: "#10b981" },
      { name: t("common.status.partial", { defaultValue: "Partial" }), value: partialValue, count: partialCount, color: "#f59e0b" },
      { name: t("common.status.unpaid", { defaultValue: "Unpaid" }), value: unpaidValue, count: unpaidCount, color: "#ef4444" },
    ].filter(item => item.count > 0);
  }, [filtered, t]);

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "reference",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.reference", { defaultValue: "Reference" })} />,
      cell: ({ row }) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.original.reference}</span>,
    },
    {
      accessorKey: "dealDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.date", { defaultValue: "Date" })} />,
      cell: ({ row }) => <span className="text-slate-500">{formatDate(row.original.dealDate)}</span>,
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.customer", { defaultValue: "Customer" })} />,
      cell: ({ row }) => <span className="text-slate-700 dark:text-slate-300 font-medium">{row.original.customerName}</span>,
    },
    {
      accessorKey: "salesmanName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.salesman", { defaultValue: "Salesman" })} />,
      cell: ({ row }) => <span className="text-slate-500">{row.original.salesmanName}</span>,
    },
    {
      accessorKey: "total",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.total_value", { defaultValue: "Total" })} />,
      cell: ({ row }) => <span className="font-bold text-slate-900 dark:text-white">{formatEGP(row.original.total)}</span>,
    },
    {
      accessorKey: "amountPaid",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.amount_paid", { defaultValue: "Paid" })} />,
      cell: ({ row }) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatEGP(row.original.amountPaid)}</span>,
    },
    {
      accessorKey: "paymentStatus",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.status", { defaultValue: "Status" })} />,
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.paymentStatus === "paid"
              ? "default"
              : row.original.paymentStatus === "partial"
              ? "secondary"
              : "destructive"
          }
          className="text-[10px] px-2 py-0.5"
        >
          {t(`deals.payment_status.${row.original.paymentStatus}`)}
        </Badge>
      ),
    },
  ], [t]);

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
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
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
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid gap-4 sm:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={FileSpreadsheet}
            label={t("reports.total_transactions")}
            value={String(filtered.length)}
            numericValue={filtered.length}
            formatter={(n) => formatNumber(Math.round(n))}
            sub={t("reports.active_pipeline_count")}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={TrendingUp}
            label={t("reports.gross_billing")}
            value={formatCompactEGP(total)}
            numericValue={total}
            formatter={(n) => formatCompactEGP(Math.round(n))}
            sub={t("reports.sum_invoices")}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Percent}
            label={t("reports.clearance_rate")}
            value={`${collectionsRate.toFixed(1)}%`}
            numericValue={collectionsRate}
            formatter={(n) => `${n.toFixed(1)}%`}
            sub={t("reports.collected_vs_gross")}
            tone="success"
          />
        </motion.div>
      </motion.div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8 h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
            <Card className="lg:col-span-4 h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
            <Card className="h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
          </div>
          <Card className="h-96 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
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
        <div className="space-y-6">
          {/* Complex Charts Row */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-12">
            {/* Revenue & Collections Trend (2/3 width) */}
            <GlowCard className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("reports.revenue_collection_trend", { defaultValue: "Revenue & Collections Trend" })}
                </GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-80">
                {trendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">{t("reports.no_sales_active")}</div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" className="text-[10px] text-slate-400 font-medium" axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => `E£${(v / 1000).toFixed(0)}k`} className="text-[10px] text-slate-400 font-medium" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(v: number) => formatCompactEGP(v)} />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                        <Area type="monotone" dataKey="sales" name={t("reports.sales_booked", { defaultValue: "Sales Booked" })} fill="#4f46e5" fillOpacity={0.1} stroke="#4f46e5" strokeWidth={2} />
                        <Line type="monotone" dataKey="collections" name={t("reports.cash_collected", { defaultValue: "Cash Collected" })} stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>

            {/* Payment status Donut Chart (1/3 width) */}
            <GlowCard className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("reports.payment_clearance", { defaultValue: "Payment Clearance" })}
                </GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-80 flex flex-col justify-between">
                <div className="h-[70%]">
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {paymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCompactEGP(v)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="flex justify-center gap-4 text-xs font-semibold">
                  {paymentStatusData.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name} ({item.count})</span>
                    </div>
                  ))}
                </div>
              </GlowCardContent>
            </GlowCard>
          </motion.div>

          {/* Existing top reps & products row */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-2">
            {/* Sales by Rep */}
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("reports.top_sales_agents")}</GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-72">
                {bySalesman.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">{t("reports.no_sales_active")}</div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bySalesman} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tickFormatter={(v) => `E£${(v / 1000).toFixed(0)}k`} className="text-[10px] text-slate-400 font-medium" axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={100} className="text-[10px] font-semibold text-slate-600 dark:text-slate-300" axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(v: number) => formatCompactEGP(v)} />
                        <Bar dataKey="total" name={t("reports.revenue_booked", { defaultValue: "Revenue Booked" })} radius={[0, 4, 4, 0]} barSize={24}>
                          {bySalesman.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>

            {/* Top Products */}
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("reports.top_products")}</GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-72">
                {byProduct.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">{t("reports.no_product_sales")}</div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byProduct} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tickFormatter={(v) => `E£${(v / 1000).toFixed(0)}k`} className="text-[10px] text-slate-400 font-medium" axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={100} className="text-[10px] font-semibold text-slate-600 dark:text-slate-300" axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(v: number) => formatCompactEGP(v)} />
                        <Bar dataKey="revenue" name={t("reports.revenue_booked", { defaultValue: "Revenue Booked" })} radius={[0, 4, 4, 0]} barSize={24}>
                          {byProduct.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>
          </motion.div>

          {/* New Transaction Ledger Table (Full width) */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("reports.transaction_ledger", { defaultValue: "Detailed Transaction Ledger" })}
                </GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-0">
                <DataTable columns={columns} data={filtered} />
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        </div>
      )}
    </PageTransition>
  );
}

