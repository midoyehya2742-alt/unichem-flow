import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/store";
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
import { useMemo, useState, useEffect } from "react";
import { formatEGP, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import type { Deal } from "@/lib/types";

export const Route = createFileRoute("/deals/")({
  head: () => ({ meta: [{ title: "Deals — UniChem ERP" }] }),
  component: () => <RequireAuth><DealsList /></RequireAuth>,
});

function DealsList() {
  const { user } = useAuth();
  const db = useDb();
  const { t } = useTranslation("common");
  
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    const tId = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(tId);
  }, []);

  const allDeals = db.listDeals();
  const visible = useMemo(() => {
    return allDeals;
  }, [allDeals]);

  const filtered = useMemo(() => {
    return visible.filter((d) => {
      if (status !== "all" && d.paymentStatus !== status) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        d.reference.toLowerCase().includes(s) ||
        d.customerName.toLowerCase().includes(s) ||
        d.salesmanName.toLowerCase().includes(s)
      );
    });
  }, [visible, q, status]);

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
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

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto" />
            <Input
              className="ps-9 h-10 text-sm focus-visible:ring-indigo-500 placeholder-slate-400"
              placeholder={t("deals.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
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
        </CardContent>
      </Card>

      {loading ? (
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
        <DataTable columns={columns} data={filtered} />
      )}
    </div>
  );
}

