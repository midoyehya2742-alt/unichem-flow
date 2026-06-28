import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, nowIso, useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Printer, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatEGP, formatDateTime } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";

export const Route = createFileRoute("/deals/$id")({
  head: () => ({ meta: [{ title: "Deal — UniChem ERP" }] }),
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
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Deal not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/deals" })}>Back to deals</Button>
      </div>
    );
  }

  const canEditPayment = user?.role === "finance" || user?.role === "admin";

  const savePayment = () => {
    if (!user) return;
    db.updateDeal({ ...deal, paymentStatus, amountPaid }, user);
    toast.success("Payment updated");
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
    toast.success("Note added");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/deals" })} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" />Back
      </Button>
      <PageHeader
        title={deal.reference}
        description={`${deal.customerName} · submitted by ${deal.salesmanName}`}
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium text-right">Qty</th>
                    <th className="px-4 py-2 font-medium text-right">Price</th>
                    <th className="px-4 py-2 font-medium text-right">Disc</th>
                    <th className="px-4 py-2 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.lines.map((l, i) => {
                    const sub = l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100);
                    return (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{l.productName}</td>
                        <td className="px-4 py-2 text-right">{l.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatEGP(l.unitPrice)}</td>
                        <td className="px-4 py-2 text-right">{l.discount}%</td>
                        <td className="px-4 py-2 text-right font-medium">{formatEGP(sub)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t bg-muted/30">
                  <tr><td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">Subtotal</td><td className="px-4 py-2 text-right">{formatEGP(deal.subtotal)}</td></tr>
                  <tr><td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">Discount</td><td className="px-4 py-2 text-right">{deal.discount}%</td></tr>
                  <tr><td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">Tax</td><td className="px-4 py-2 text-right">{deal.tax}%</td></tr>
                  <tr className="border-t"><td colSpan={4} className="px-4 py-3 text-right font-semibold">Total</td><td className="px-4 py-3 text-right font-bold text-lg">{formatEGP(deal.total)}</td></tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {deal.notes && (
            <Card>
              <CardHeader><CardTitle>Salesman notes</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{deal.notes}</CardContent>
            </Card>
          )}

          {deal.attachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {deal.attachments.map((a) => (
                  <a key={a.id} href={a.dataUrl} download={a.name} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm border rounded px-3 py-2 hover:bg-accent">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Finance notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {deal.financeNotes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
              {deal.financeNotes.map((n) => (
                <div key={n.id} className="border-l-2 border-primary pl-3 py-1">
                  <div className="text-sm">{n.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.authorName} · {formatDateTime(n.createdAt)}</div>
                </div>
              ))}
              {(canEditPayment || user?.id === deal.salesmanId) && (
                <div className="space-y-2 pt-2">
                  <Textarea rows={2} placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  <Button size="sm" onClick={addNote}><Send className="h-4 w-4 mr-1" />Post note</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Reference" value={deal.reference} />
              <Row label="Customer" value={deal.customerName} />
              <Row label="Salesman" value={deal.salesmanName} />
              <Row label="Date" value={formatDateTime(deal.dealDate)} />
              {deal.expectedPaymentDate && <Row label="Expected payment" value={formatDateTime(deal.expectedPaymentDate)} />}
              <Row label="Total" value={<span className="font-semibold">{formatEGP(deal.total)}</span>} />
              <Row label="Amount paid" value={formatEGP(deal.amountPaid)} />
              <Row label="Status" value={<Badge variant={deal.paymentStatus === "paid" ? "default" : deal.paymentStatus === "partial" ? "secondary" : "destructive"}>{deal.paymentStatus}</Badge>} />
            </CardContent>
          </Card>

          {canEditPayment && (
            <Card>
              <CardHeader><CardTitle>Update payment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={paymentStatus} onValueChange={(v: PaymentStatus) => setPaymentStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount paid (EGP)</Label>
                  <Input type="number" min={0} step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)} />
                </div>
                <Button className="w-full" onClick={savePayment}>Save</Button>
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
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
