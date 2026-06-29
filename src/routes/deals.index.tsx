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
  Plus, Search, Download, FileText, FilterX, ArrowUpDown, ChevronLeft, ChevronRight,
  Eye, RefreshCw, Layers
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { formatEGP, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/deals/")({
  head: () => ({ meta: [{ title: "Deals — UniChem ERP" }] }),
  component: () => <RequireAuth><DealsList /></RequireAuth>,
});

type SortField = "reference" | "dealDate" | "customerName" | "salesmanName" | "total";
type SortOrder = "asc" | "desc";

function DealsList() {
  const { user } = useAuth();
  const db = useDb();
  
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("dealDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Simulate loader for high-fidelity feel
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const allDeals = db.listDeals();
  const visible = useMemo(() => {
    return user?.role === "salesman" ? allDeals.filter((d) => d.salesmanId === user.id) : allDeals;
  }, [allDeals, user]);

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

  // Sort & Paginated Data
  const processedData = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });

    const startIndex = (page - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, sortField, sortOrder, page]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Deals & Ledger"
        description={user?.role === "salesman" ? "Review and track your pipeline transactions." : "Global ledger auditing deals across all agents."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-9 text-xs">
              <Download className="h-3.5 w-3.5 mr-2 text-slate-500" /> Export CSV
            </Button>
            {(user?.role === "salesman" || user?.role === "admin") && (
              <Link to="/deals/new">
                <Button size="sm" className="h-9 text-xs shadow-md shadow-indigo-600/10">
                  <Plus className="h-3.5 w-3.5 mr-2" /> New Deal
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Modern Filter Card */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 h-10 text-sm focus-visible:ring-indigo-500 placeholder-slate-400"
              placeholder="Search reference, customer, salesman..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-56 h-10 text-xs">
              <SelectValue placeholder="All payment statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Main Grid/Table Section */}
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No transactions found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {q || status !== "all" 
                ? "No records match your active search filters. Try adjusting or clearing your settings." 
                : "The database ledger is empty. Go ahead and create your first transaction to populate the records."}
            </p>
            {(user?.role === "salesman" || user?.role === "admin") && !q && status === "all" && (
              <Link to="/deals/new" className="mt-4">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Create First Deal
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
                  <tr className="text-left text-slate-500 font-semibold">
                    <th className="px-5 py-3.5">
                      <button onClick={() => handleSort("reference")} className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
                        Reference <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-5 py-3.5">
                      <button onClick={() => handleSort("dealDate")} className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
                        Date <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-5 py-3.5">
                      <button onClick={() => handleSort("customerName")} className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
                        Customer <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-5 py-3.5 hidden md:table-cell">
                      <button onClick={() => handleSort("salesmanName")} className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
                        Salesman <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-5 py-3.5 text-right">
                      <button onClick={() => handleSort("total")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900 dark:hover:text-white transition">
                        Total Value <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {processedData.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {d.reference}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(d.dealDate)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {d.customerName}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-slate-500">
                        {d.salesmanName}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-950 dark:text-white">
                        {formatEGP(d.total)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            d.paymentStatus === "paid"
                              ? "default"
                              : d.paymentStatus === "partial"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-[10px] px-2 py-0.5"
                        >
                          {d.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to="/deals/$id" params={{ id: d.id }}>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Simple Premium Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{(page - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Math.min(page * itemsPerPage, filtered.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</span> transactions
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                Page <span className="font-semibold text-slate-850 dark:text-slate-200">{page}</span> of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
