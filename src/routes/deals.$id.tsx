import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Printer, Paperclip, Send, Clock, CheckCircle2, AlertTriangle, MessageSquare, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatEGP, formatDateTime } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/deals/$id")({
  head: () => ({ meta: [{ title: "Deal Details — UniChem ERP" }] }),
  component: () => <RequireAuth><DealDetails /></RequireAuth>,
});

function DealDetails() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const db = useDb();
  const navigate = useNavigate();
  const deal = db.getDeal(id);

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(deal?.paymentStatus ?? "unpaid");
  const [amountPaid, setAmountPaid] = useState<number>(deal?.amountPaid ?? 0);
  const [noteText, setNoteText] = useState("");

  if (!deal) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Transaction not found</h2>
        <p className="text-xs text-slate-500">The requested deal code is either archived or invalid.</p>
        <Button variant="outline" className="w-full text-xs" onClick={() => navigate({ to: "/deals" })}>
          Back to Deals Ledger
        </Button>
      </div>
    );
  }

  const canEditPayment = user?.role === "finance" || user?.role === "admin";

  const savePayment = () => {
    if (!user) return;
    db.updateDeal({ ...deal, paymentStatus, amountPaid }, user);
    toast.success("Payment status ledger synchronized successfully!");
  };

  const addNote = () => {
    if (!user || !noteText.trim()) return;
    const updated = {
      ...deal,
      financeNotes: [
        ...deal.financeNotes,
        { id: newId(), authorId: user.id, authorName: user.name, text: noteText.trim(), createdAt: nowIso() },
      ],
    };
    db.updateDeal(updated, user);
    setNoteText("");
    toast.success("Audit note added to transaction history");
  };

  // Timeline Step Tracker
  const steps = [
    { key: "unpaid", label: "Unpaid / Pending Audit", desc: "Deal recorded, awaiting transaction slip verification." },
    { key: "partial", label: "Partially Settled", desc: "Down payment processed, balance remaining." },
    { key: "paid", label: "Fully Cleared", desc: "All funds deposited and ledger entry finalized." }
  ];
  const activeStepIdx = steps.findIndex((s) => s.key === deal.paymentStatus);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans print:p-0 print:max-w-full">
      {/* Back & Actions header */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/deals" })} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Ledger
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs">
          <Printer className="h-4 w-4 mr-2 text-slate-500" /> Print invoice
        </Button>
      </div>

      <PageHeader
        title={deal.reference}
        description={`Submitted by ${deal.salesmanName} on ${new Date(deal.dealDate).toLocaleDateString()}`}
      />

      {/* Modern Pipeline Timeline Stepper */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <CardContent className="p-5">
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-4">
            {steps.map((step, idx) => {
              const completed = idx < activeStepIdx || deal.paymentStatus === "paid";
              const current = idx === activeStepIdx && deal.paymentStatus !== "paid";
              
              return (
                <div key={step.key} className="flex-1 flex gap-3 items-start relative z-10 w-full">
                  <div className={cn(
                    "h-8 w-8 rounded-full border grid place-items-center shrink-0 font-bold text-xs transition",
                    completed ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10" :
                    current ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10" :
                    "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                  )}>
                    {completed ? <CheckCircle2 className="h-4.5 w-4.5" /> : idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white capitalize">{step.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid split */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Line Items Table */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Portioned Products Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr className="text-left font-semibold">
                    <th className="px-5 py-3">Product Catalog Item</th>
                    <th className="px-5 py-3 text-right">Quantity</th>
                    <th className="px-5 py-3 text-right">Price per Unit</th>
                    <th className="px-5 py-3 text-right">Discount</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deal.lines.map((l, i) => {
                    const sub = l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100);
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{l.productName}</td>
                        <td className="px-5 py-3 text-right font-medium">{l.quantity}</td>
                        <td className="px-5 py-3 text-right">{formatEGP(l.unitPrice)}</td>
                        <td className="px-5 py-3 text-right text-rose-500">{l.discount}%</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">{formatEGP(sub)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-500">
                  <tr>
                    <td colSpan={4} className="px-5 py-2.5 text-right font-medium">Subtotal</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{formatEGP(deal.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-2.5 text-right font-medium">Overall Discount</td>
                    <td className="px-5 py-2.5 text-right text-rose-500">{deal.discount}%</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-2.5 text-right font-medium">Taxation Rate</td>
                    <td className="px-5 py-2.5 text-right">{deal.tax}%</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-850">
                    <td colSpan={4} className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">Cleared Total</td>
                    <td className="px-5 py-3 text-right font-black text-sm text-indigo-600 dark:text-indigo-400">{formatEGP(deal.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Salesman remarks notes */}
          {deal.notes && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Salesman Remarks</CardTitle>
              </CardHeader>
              <CardContent className="text-xs whitespace-pre-wrap text-slate-600 dark:text-slate-400 leading-relaxed">
                {deal.notes}
              </CardContent>
            </Card>
          )}

          {/* Attachments Section */}
          {deal.attachments && deal.attachments.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Transaction files</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {deal.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.dataUrl}
                    download={a.name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition group"
                  >
                    <Paperclip className="h-4.5 w-4.5 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{a.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{(a.size / 1024).toFixed(0)} KB</div>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Finance collaborative notes log */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-500" /> Audit Log & Finance Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deal.financeNotes.length === 0 ? (
                <div className="text-xs text-slate-400 dark:text-slate-500 py-2">No finance notes logged on this transaction.</div>
              ) : (
                <div className="space-y-3">
                  {deal.financeNotes.map((n) => (
                    <div key={n.id} className="flex gap-3 items-start border-l-2 border-indigo-500 pl-3.5 py-1">
                      <div className="flex-1">
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{n.text}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          By <span className="font-bold text-slate-500">{n.authorName}</span> · {formatDateTime(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {(canEditPayment || user?.id === deal.salesmanId) && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Textarea
                    rows={2}
                    placeholder="Type comments or audit updates here..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="text-xs focus-visible:ring-indigo-500 placeholder-slate-400 resize-none"
                  />
                  <Button size="sm" onClick={addNote} className="h-8 text-xs">
                    <Send className="h-3 w-3 mr-1.5" /> Post Comment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary & Payment Controls */}
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/85">
              <CardTitle className="text-sm font-bold">Ledger Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <Row label="Deal Ref" value={<span className="font-bold text-slate-850 dark:text-white">{deal.reference}</span>} />
              <Row label="Client Account" value={<span className="font-semibold text-slate-850 dark:text-white">{deal.customerName}</span>} />
              <Row label="Sales Agent" value={deal.salesmanName} />
              <Row label="Created on" value={formatDateTime(deal.dealDate)} />
              {deal.expectedPaymentDate && <Row label="Payment Target" value={formatDateTime(deal.expectedPaymentDate)} />}
              <Row label="Invoice Total" value={<span className="font-bold text-indigo-600 dark:text-indigo-400">{formatEGP(deal.total)}</span>} />
              <Row label="Collected Total" value={<span className="font-bold text-emerald-600 dark:text-emerald-400">{formatEGP(deal.amountPaid)}</span>} />
              <Row
                label="Clearing Status"
                value={
                  <Badge variant={deal.paymentStatus === "paid" ? "default" : deal.paymentStatus === "partial" ? "secondary" : "destructive"} className="text-[10px] px-2">
                    {deal.paymentStatus}
                  </Badge>
                }
              />
            </CardContent>
          </Card>

          {/* Payment updating panel */}
          {canEditPayment && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Settle Transaction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-slate-500">Status</Label>
                  <Select value={paymentStatus} onValueChange={(v: PaymentStatus) => setPaymentStatus(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid / Pending</SelectItem>
                      <SelectItem value="partial">Partially Paid</SelectItem>
                      <SelectItem value="paid">Fully Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-slate-500">Receipt Deposit (EGP)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs"
                  />
                </div>
                <Button className="w-full h-9 text-xs shadow-md shadow-emerald-500/10" onClick={savePayment}>
                  Commit Settlement
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-100 dark:border-slate-800/40">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-right text-slate-700 dark:text-slate-300 font-semibold">{value}</span>
    </div>
  );
}
