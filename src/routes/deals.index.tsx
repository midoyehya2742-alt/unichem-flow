import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Download, FilterX, Eye
} from "lucide-react";
import { useMemo, useState } from "react";
import { useDealsPaginated, useDashboardStats } from "@/hooks/queries";
import { useDebounce } from "@/hooks/use-debounce";
import { formatEGP, formatDate, formatCompactEGP } from "@/lib/format";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import type { Deal } from "@/lib/types";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from "@/components/ui/glow-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { Wallet, FileText, AlertTriangle } from "lucide-react";



export const Route = createFileRoute("/deals/")({
  head: () => ({ meta: [{ title: "Deals — UniChem ERP" }] }),
  component: () => <RequireAuth><DealsList /></RequireAuth>,
});

function DealsList() {
  const { user } = useAuth();
  const { t } = useTranslation("common");
  
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  
  // Debounce the search query for the API
  const debouncedQ = useDebounce(q, 300);

  // Use the new paginated query
  const { data: dealsData, isLoading: dealsLoading } = useDealsPaginated(page + 1, pageSize, status, debouncedQ);
  const filtered = dealsData?.data || [];
  const count = dealsData?.count || 0;

  // Global stats for the widgets
  const { data: stats } = useDashboardStats();
  const pipelineValue = stats?.outstanding || 0;
  const collectedValue = stats?.paid || 0;
  const totalDeals = stats?.total_deals || count; // approx
  
  // Calculate salesHistoryData from stats (assuming the RPC returns 7 days of history, we'll map that to the chart)
  const salesHistoryData = useMemo(() => {
    if (!stats?.last_7_days) return [];
    return stats.last_7_days.map((d: any) => {
      const dateObj = new Date(d.day);
      return {
        date: d.day,
        label: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sales: d.total,
        collected: d.amount_paid
      };
    });
  }, [stats]);

  const salesmanData = stats?.top_salesmen || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.warning("No records available to export");
      return;
    }
    const rows = [
      ["Reference", "Date", "Customer", "Salesman", "Total (EGP)", "Paid (EGP)", "Payment Status", "Deal Status"],
      ...filtered.map((d) => [
        d.reference,
        formatDate(d.dealDate),
        d.customerName,
        d.salesmanName,
        d.total.toFixed(2),
        d.amountPaid.toFixed(2),
        d.paymentStatus,
        d.dealStatus,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unichem-deals-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded successfully");
  };

  const columns: ColumnDef<Deal>[] = [
    {
      accessorKey: "reference",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.reference")} />,
      cell: ({ row }) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.original.reference}</span>,
    },
    {
      accessorKey: "dealDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.date")} />,
      cell: ({ row }) => <span className="text-slate-500">{formatDate(row.original.dealDate)}</span>,
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.customer")} />,
      cell: ({ row }) => <span className="text-slate-700 dark:text-slate-300 font-medium">{row.original.customerName}</span>,
    },
    {
      accessorKey: "salesmanName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.salesman")} />,
      cell: ({ row }) => <span className="text-slate-500">{row.original.salesmanName}</span>,
    },
    {
      accessorKey: "total",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.total_value")} />,
      cell: ({ row }) => <span className="font-bold text-slate-950 dark:text-white">{formatEGP(row.original.total)}</span>,
    },
    {
      accessorKey: "paymentStatus",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("deals.status")} />,
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
    {
      id: "actions",
      header: t("common.actions.title"),
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Link to="/deals/$id" params={{ id: d.id }}>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("nav.deals")}
        description={user?.role === "salesman" ? t("deals.desc_salesman") : t("deals.desc_admin")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-9 text-xs">
              <Download className="h-3.5 w-3.5 me-2 text-slate-500" /> {t("common.actions.export")}
            </Button>
            {(user?.role === "salesman" || user?.role === "admin") && (
              <Link to="/deals/new">
                <Button size="sm" className="h-9 text-xs shadow-md shadow-indigo-600/10">
                  <Plus className="h-3.5 w-3.5 me-2" /> {t("deals.new_deal")}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Sales trend & Directory list (2/3 width) */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* Daily Sales Line Chart */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("deals.daily_sales_collections", { defaultValue: "Daily Sales & Collections (Last 15 Days)" })}</GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-80">
                {salesHistoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No transaction history</div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesHistoryData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" className="text-[10px] text-slate-400 font-medium" />
                        <YAxis className="text-[10px]" tickFormatter={(v) => formatCompactEGP(v)} label={{ value: "Value (EGP)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-slate-900 dark:text-white">{data.date}</p>
                                  <p className="text-teal-600 dark:text-teal-400 font-medium">{t("deals.sales_booked", { defaultValue: "Sales Booked" })}: {formatEGP(data.sales)}</p>
                                  <p className="text-pink-600 dark:text-pink-400 font-medium">{t("deals.cash_collected", { defaultValue: "Cash Collected" })}: {formatEGP(data.collected)}</p>
                                  <p className="text-amber-500 font-medium">{t("deals.outstanding", { defaultValue: "Outstanding" })}: {formatEGP(data.sales - data.collected)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="sales" name={t("deals.sales_booked_total", { defaultValue: "Sales Booked (Total EGP)" })} stroke="#0d9488" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                        <Line type="monotone" dataKey="collected" name={t("deals.cash_collected_paid", { defaultValue: "Cash Collected (Paid EGP)" })} stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>
          </motion.div>

          {/* Deals Table & Filters */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t("deals.search_deals", "Search deals...")}
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(0); }}
                    className="pl-9 h-10 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50"
                  />
                </div>
                <Select value={status} onValueChange={(val) => { setStatus(val); setPage(0); }}>
                  <SelectTrigger className="sm:w-56 h-10 text-xs">
                    <SelectValue placeholder={t("deals.filter_all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("deals.filter_all")}</SelectItem>
                    <SelectItem value="unpaid">{t("deals.payment_status.unpaid")}</SelectItem>
                    <SelectItem value="partial">{t("deals.payment_status.partial")}</SelectItem>
                    <SelectItem value="paid">{t("deals.payment_status.paid")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {dealsLoading ? (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4 flex justify-between items-center animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
                    <FilterX className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("deals.no_transactions")}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    {q || status !== "all" 
                      ? t("deals.no_search_results") 
                      : t("deals.empty_ledger")}
                  </p>
                  {(user?.role === "salesman" || user?.role === "admin") && !q && status === "all" && (
                    <Link to="/deals/new" className="mt-4">
                      <Button size="sm">
                        <Plus className="h-4 w-4 me-2" /> {t("deals.create_first")}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <DataTable
                columns={columns}
                data={filtered}
                showSearch={false}
                serverSidePagination={{
                  pageIndex: page,
                  pageSize,
                  pageCount: Math.ceil(count / pageSize),
                  onPageChange: setPage
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Right Column - Sticky Sidebar KPIs & Salesperson Performance (1/3 width) */}
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show"
          className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 order-1 lg:order-2"
        >
          {/* Vertical Stack of KPIs */}
          <div className="space-y-4">
            <motion.div variants={itemVariants}>
              <KpiCard
                icon={FileText}
                label={t("deals.total_deals", { defaultValue: "Total Deals" })}
                value={totalDeals.toString()}
                numericValue={totalDeals}
                formatter={(v) => Math.round(v).toString()}
                tone="primary"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KpiCard
                icon={AlertTriangle}
                label={t("deals.pipeline_value", { defaultValue: "Pipeline Value" })}
                value={formatCompactEGP(pipelineValue)}
                numericValue={pipelineValue}
                formatter={(v) => formatCompactEGP(v)}
                tone="warning"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KpiCard
                icon={Wallet}
                label={t("deals.collected_value", { defaultValue: "Total Collected" })}
                value={formatCompactEGP(collectedValue)}
                numericValue={collectedValue}
                formatter={(v) => formatCompactEGP(v)}
                tone="success"
              />
            </motion.div>
          </div>

          {/* Salesperson Performance Chart */}
          <motion.div variants={itemVariants}>
            <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("deals.salesperson_performance", { defaultValue: "Salesperson Performance" })}</GlowCardTitle>
              </GlowCardHeader>
              <GlowCardContent className="p-4 h-80">
                {salesmanData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No salesperson data</div>
                ) : (
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesmanData} margin={{ top: 20, right: 10, bottom: 20, left: 10 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#e2e8f0" />
                        <XAxis type="number" tickFormatter={(v) => formatCompactEGP(v)} className="text-[9px] text-slate-400 font-medium" />
                        <YAxis dataKey="name" type="category" width={80} className="text-[9px] font-semibold text-slate-600 dark:text-slate-300" axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-slate-900 dark:text-white">{data.name}</p>
                                  <p className="text-teal-600 dark:text-teal-400 font-medium">{t("deals.collected", { defaultValue: "Collected" })}: {formatEGP(data.collected)}</p>
                                  <p className="text-pink-600 dark:text-pink-400 font-medium">{t("deals.outstanding", { defaultValue: "Outstanding" })}: {formatEGP(data.outstanding)}</p>
                                  <p className="text-indigo-500 font-bold border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">{t("deals.total", { defaultValue: "Total" })}: {formatEGP(data.total)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="collected" name={t("deals.collected", { defaultValue: "Collected" })} stackId="a" fill="#0d9488" barSize={12} />
                        <Bar dataKey="outstanding" name={t("deals.outstanding", { defaultValue: "Outstanding" })} stackId="a" fill="#ec4899" radius={[0, 2, 2, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}

