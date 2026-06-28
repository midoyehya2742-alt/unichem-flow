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
import { Plus, Search, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEGP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/deals/")({
  head: () => ({ meta: [{ title: "Deals — UniChem ERP" }] }),
  component: () => <RequireAuth><DealsList /></RequireAuth>,
});

function DealsList() {
  const { user } = useAuth();
  const db = useDb();
  const all = db.listDeals();
  const visible = user?.role === "salesman" ? all.filter((d) => d.salesmanId === user.id) : all;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return visible.filter((d) => {
      if (status !== "all" && d.paymentStatus !== status) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return d.reference.toLowerCase().includes(s)
        || d.customerName.toLowerCase().includes(s)
        || d.salesmanName.toLowerCase().includes(s);
    });
  }, [visible, q, status]);

  const exportCsv = () => {
    const rows = [
      ["Reference", "Date", "Customer", "Salesman", "Total (EGP)", "Paid (EGP)", "Payment", "Deal Status"],
      ...filtered.map((d) => [
        d.reference, formatDate(d.dealDate), d.customerName, d.salesmanName,
        d.total.toFixed(2), d.amountPaid.toFixed(2), d.paymentStatus, d.dealStatus,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `unichem-deals-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Deals"
        description={user?.role === "salesman" ? "Your submitted deals." : "All deals across the company."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            {(user?.role === "salesman" || user?.role === "admin") && (
              <Link to="/deals/new"><Button><Plus className="h-4 w-4 mr-2" />New Deal</Button></Link>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search reference, customer, salesman…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Salesman</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No deals match your filters.</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id} className="border-t hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link to="/deals/$id" params={{ id: d.id }} className="font-medium text-primary hover:underline">{d.reference}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(d.dealDate)}</td>
                  <td className="px-4 py-3">{d.customerName}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{d.salesmanName}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatEGP(d.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={d.paymentStatus === "paid" ? "default" : d.paymentStatus === "partial" ? "secondary" : "destructive"}>
                      {d.paymentStatus}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
