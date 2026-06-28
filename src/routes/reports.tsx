import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEGP, formatDate } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin", "finance"]}><ReportsPage /></RequireAuth>,
});

type Range = "7d" | "30d" | "90d" | "ytd";

function ReportsPage() {
  const db = useDb();
  const deals = db.listDeals();
  const [range, setRange] = useState<Range>("30d");

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

  const bySalesman = Object.values(filtered.reduce<Record<string, { name: string; total: number; count: number }>>((acc, d) => {
    acc[d.salesmanId] = acc[d.salesmanId] || { name: d.salesmanName, total: 0, count: 0 };
    acc[d.salesmanId].total += d.total; acc[d.salesmanId].count += 1; return acc;
  }, {}));

  const byProduct = Object.values(filtered.flatMap((d) => d.lines).reduce<Record<string, { name: string; qty: number; revenue: number }>>((acc, l) => {
    acc[l.productId] = acc[l.productId] || { name: l.productName, qty: 0, revenue: 0 };
    acc[l.productId].qty += l.quantity;
    acc[l.productId].revenue += l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100);
    return acc;
  }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const exportCsv = () => {
    const rows = [
      ["Reference", "Date", "Customer", "Salesman", "Total", "Paid", "Status"],
      ...filtered.map((d) => [d.reference, formatDate(d.dealDate), d.customerName, d.salesmanName, d.total, d.amountPaid, d.paymentStatus]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `unichem-report-${range}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Reports" description="Analyze sales activity across salesmen, products & periods."
        actions={
          <div className="flex gap-2">
            <Select value={range} onValueChange={(v: Range) => setRange(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export</Button>
          </div>
        } />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Deals" value={String(filtered.length)} />
        <Stat label="Revenue" value={formatEGP(total)} />
        <Stat label="Collected" value={formatEGP(paid)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top salesmen</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySalesman}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => formatEGP(v)} />
                <Bar dataKey="total" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top products</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProduct} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="name" width={120} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => formatEGP(v)} />
                <Bar dataKey="revenue" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
