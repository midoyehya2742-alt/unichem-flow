import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { ArrowLeft, Printer, Paperclip, Send, CheckCircle2, XCircle, AlertTriangle, Clock, MessageSquare, TrendingUp, Trash2, Edit2, Hourglass } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatEGP, formatDateTime } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(deal?.paymentStatus ?? "unpaid");
  const [amountPaid, setAmountPaid] = useState<number>(deal?.amountPaid ?? 0);
  const [noteText, setNoteText] = useState("");

  if (!deal) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800 dark:text-white">{t("deals.not_found_title")}</h2>
        <p className="text-xs text-slate-500">{t("deals.not_found_desc")}</p>
        <Button variant="outline" className="w-full text-xs" onClick={() => navigate({ to: "/deals" })}>
          {t("deals.back_to_ledger")}
        </Button>
      </div>
    );
  }

  const canApproveDeal = user?.role === "finance" || user?.role === "admin";
  const isFinanceOrAdmin = user?.role === "finance" || user?.role === "admin";
  const isSalesman = user?.role === "salesman";
  const canEditPayment = isFinanceOrAdmin;

  const editReq = deal.editRequest;
  const myEditRequest = isSalesman && editReq?.requestedBy === user?.id ? editReq : undefined;

  const handleAccept = () => {
    if (!user) return;
    const updated = { ...deal, dealStatus: "approved" as const, updatedAt: nowIso() };
    db.updateDeal(updated, user);
    toast.success(`Deal ${deal.reference} approved!`);
  };

  const handleReject = () => {
    if (!user) return;
    const updated = { ...deal, dealStatus: "rejected" as const, updatedAt: nowIso() };
    db.updateDeal(updated, user);
    toast.error(`Deal ${deal.reference} rejected.`);
  };

  const handleRequestEdit = () => {
    if (!user) return;
    db.requestEditDeal(deal.id, user);
    toast.success("Edit request submitted! Finance will review it shortly.");
  };

  const handleApproveEdit = () => {
    if (!user) return;
    db.reviewEditRequest(deal.id, true, user);
    toast.success(`Edit request for ${deal.reference} approved — salesman can now edit.`);
  };

  const handleRejectEdit = () => {
    if (!user) return;
    db.reviewEditRequest(deal.id, false, user);
    toast.error(`Edit request for ${deal.reference} rejected.`);
  };

  const savePayment = () => {
    if (!user) return;
    db.updateDeal({ ...deal, paymentStatus, amountPaid }, user);
    toast.success(t("deals.payment_saved"));
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
    toast.success(t("deals.note_added"));
  };

  // Timeline Step Tracker
  const steps = [
    { key: "unpaid", label: t("deals.step_unpaid_label"), desc: t("deals.step_unpaid_desc") },
    { key: "partial", label: t("deals.step_partial_label"), desc: t("deals.step_partial_desc") },
    { key: "paid", label: t("deals.step_paid_label"), desc: t("deals.step_paid_desc") }
  ];
  const activeStepIdx = steps.findIndex((s) => s.key === deal.paymentStatus);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans print:p-0 print:max-w-full">
      {/* Back & Actions header */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/deals" })} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4 me-1.5 rtl:rotate-180" /> {t("deals.back_to_ledger")}
        </Button>
        <div className="flex gap-2">
          {/* Finance/Admin can always edit unless rejected */}
          {isFinanceOrAdmin && deal.dealStatus !== "rejected" && (
            <Button variant="outline" size="sm" onClick={() => navigate({ to: `/deals/${id}/edit` })} className="h-8 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800">
              <TrendingUp className="h-4 w-4 me-2" /> Edit Deal
            </Button>
          )}
          {/* Salesman edit request flow */}
          {isSalesman && deal.dealStatus === "approved" && (
            <>
              {/* No pending request OR request was rejected → show Request Edit */}
              {(!myEditRequest || myEditRequest.status === "rejected") && (
                <Button variant="outline" size="sm" onClick={handleRequestEdit}
                  className="h-8 text-xs bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800">
                  <Edit2 className="h-4 w-4 me-2" /> Request Edit
                </Button>
              )}
              {/* Request is pending → locked button */}
              {myEditRequest?.status === "pending" && (
                <Button variant="outline" size="sm" disabled
                  className="h-8 text-xs opacity-70 cursor-not-allowed border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-700">
                  <Hourglass className="h-4 w-4 me-2 animate-pulse" /> Edit Request Pending…
                </Button>
              )}
              {/* Request is approved → go to edit */}
              {myEditRequest?.status === "approved" && (
                <Button variant="outline" size="sm" onClick={() => navigate({ to: `/deals/${id}/edit` })}
                  className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  <Edit2 className="h-4 w-4 me-2" /> Edit Deal
                </Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs">
            <Printer className="h-4 w-4 me-2 text-slate-500" /> {t("common.actions.print_invoice")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setPaymentStatus(deal.paymentStatus ?? "unpaid");
            setAmountPaid(deal.amountPaid ?? 0);
            setNoteText("");
          }} className="h-8 text-xs">
            {t("common.actions.cancel")}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => {
            if (window.confirm("Are you sure you want to delete this deal?")) {
              db.deleteDeal(deal.id);
              toast.success("Deal deleted");
              navigate({ to: "/deals" });
            }
          }} className="h-8 text-xs">
            <Trash2 className="h-4 w-4 me-2" /> Delete
          </Button>
        </div>
      </div>

      <PageHeader
        title={deal.reference}
        description={t("deals.submitted_by", { name: deal.salesmanName, date: new Date(deal.dealDate).toLocaleDateString() })}
      />

      {/* Salesman: pending edit request banner */}
      {isSalesman && myEditRequest?.status === "pending" && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-violet-300 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-700 print:hidden">
          <Hourglass className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-bold text-violet-800 dark:text-violet-300">Edit Request Submitted</p>
            <p className="text-xs text-violet-700 dark:text-violet-400">Your request to edit this deal is awaiting review by Finance or Admin. You will be able to edit once it is approved.</p>
          </div>
        </div>
      )}

      {/* Salesman: rejected edit request banner */}
      {isSalesman && myEditRequest?.status === "rejected" && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 print:hidden">
          <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
            Your edit request was rejected by <strong>{myEditRequest.reviewedByName}</strong>. You can submit a new request.
          </p>
        </div>
      )}

      {/* Finance/Admin: pending edit request review banner */}
      {isFinanceOrAdmin && deal.editRequest?.status === "pending" && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-violet-300 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-700 print:hidden">
          <Edit2 className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-violet-800 dark:text-violet-300">Edit Request from Salesman</p>
            <p className="text-xs text-violet-700 dark:text-violet-400">
              <strong>{deal.editRequest.requestedByName}</strong> requested to edit this deal on {new Date(deal.editRequest.requestedAt).toLocaleString()}. Approve to allow editing.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={handleRejectEdit} variant="outline" className="h-8 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400">
              <XCircle className="h-4 w-4 me-1.5" /> Reject
            </Button>
            <Button size="sm" onClick={handleApproveEdit} className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">
              <CheckCircle2 className="h-4 w-4 me-1.5" /> Approve Edit
            </Button>
          </div>
        </div>
      )}

      {/* Approval Banner — visible to finance/admin when deal is pending */}
      {canApproveDeal && deal.dealStatus === "pending" && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 print:hidden">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Pending Your Review</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">This deal was submitted by <strong>{deal.salesmanName}</strong> and is awaiting approval before it can be processed.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={handleReject} variant="outline" className="h-8 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400">
              <XCircle className="h-4 w-4 me-1.5" /> Reject
            </Button>
            <Button size="sm" onClick={handleAccept} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 me-1.5" /> Accept Deal
            </Button>
          </div>
        </div>
      )}

      {/* Status banners for already-decided deals */}
      {deal.dealStatus === "approved" && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 print:hidden">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">This deal has been approved and is active.</p>
        </div>
      )}
      {deal.dealStatus === "rejected" && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 print:hidden">
          <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">This deal has been rejected. Editing is disabled.</p>
          {canApproveDeal && (
            <Button size="sm" onClick={handleAccept} variant="outline" className="ml-auto h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <CheckCircle2 className="h-3.5 w-3.5 me-1" /> Re-approve
            </Button>
          )}
        </div>
      )}

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
              <CardTitle className="text-sm font-bold">{t("deals.products_summary")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr className="text-start font-semibold">
                    <th className="px-5 py-3 text-start">{t("deals.product_item")}</th>
                    <th className="px-5 py-3 text-end">{t("deals.quantity")}</th>
                    <th className="px-5 py-3 text-end">{t("deals.price_per_unit")}</th>
                    <th className="px-5 py-3 text-end">{t("deals.discount")}</th>
                    <th className="px-5 py-3 text-end">{t("deals.subtotal")}</th>
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
                    <td colSpan={4} className="px-5 py-2.5 text-end font-medium">{t("deals.subtotal")}</td>
                    <td className="px-5 py-2.5 text-end font-semibold text-slate-800 dark:text-slate-200">{formatEGP(deal.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-2.5 text-end font-medium">{t("deals.overall_discount")}</td>
                    <td className="px-5 py-2.5 text-end text-rose-500">{deal.discount}%</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-2.5 text-end font-medium">{t("deals.tax_rate")}</td>
                    <td className="px-5 py-2.5 text-end">{deal.tax}%</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-850">
                    <td colSpan={4} className="px-5 py-3 text-end font-bold text-slate-900 dark:text-white">{t("deals.cleared_total")}</td>
                    <td className="px-5 py-3 text-end font-black text-sm text-indigo-600 dark:text-indigo-400">{formatEGP(deal.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Salesman remarks notes */}
          {deal.notes && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">{t("deals.salesman_remarks")}</CardTitle>
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
                <CardTitle className="text-sm font-bold">{t("deals.transaction_files")}</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {deal.attachments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={async () => {
                      const url = await db.getAttachmentUrl(a);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                      else toast.error(t("deals.attachment_unavailable"));
                    }}
                    className="flex items-center gap-3 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition group text-start w-full"
                  >
                    <Paperclip className="h-4.5 w-4.5 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{a.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{(a.size / 1024).toFixed(0)} KB</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Method Section */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-0 print:m-0 print:p-0">
            <CardHeader className="pb-2 print:p-0 print:mb-2">
              <CardTitle className="text-sm font-bold">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Payment Type</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{deal.paymentType || "immediate"}</span>
                <span className="text-slate-500">Method</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{deal.paymentMethod || "cash"}</span>
                {deal.paymentType === "installments" && (
                  <>
                    <span className="text-slate-500">Immediate Down Payment</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatEGP(deal.immediateAmount || 0)}</span>
                  </>
                )}
              </div>
              {deal.paymentInfo && (
                <div>
                  <span className="text-slate-500 block mb-1">Payment Details</span>
                  <div className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                    {deal.paymentInfo}
                  </div>
                </div>
              )}
              {deal.paymentType === "installments" && deal.paymentMethod === "cheques" && deal.cheques && deal.cheques.length > 0 && (
                <div className="mt-3">
                  <span className="text-slate-500 block mb-2 font-semibold">Installment Cheques</span>
                  <div className="space-y-2">
                    {deal.cheques.map((c: any, i: number) => (
                      <div key={c.id || i} className="flex justify-between p-2 border rounded-md">
                        <span className="text-slate-600">Cheque {i + 1} ({formatDateTime(c.dueDate).split(",")[0]})</span>
                        <span className="font-semibold">{formatEGP(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finance collaborative notes log */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-500" /> {t("deals.audit_log")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deal.financeNotes.length === 0 ? (
                <div className="text-xs text-slate-400 dark:text-slate-500 py-2">{t("deals.no_finance_notes")}</div>
              ) : (
                <div className="space-y-3">
                  {deal.financeNotes.map((n) => (
                    <div key={n.id} className="flex gap-3 items-start border-s-2 border-indigo-500 ps-3.5 py-1">
                      <div className="flex-1">
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{n.text}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {t("deals.note_by", { author: n.authorName })} · {formatDateTime(n.createdAt)}
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
                    placeholder={t("deals.type_comments")}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="text-xs focus-visible:ring-indigo-500 placeholder-slate-400 resize-none"
                  />
                  <Button size="sm" onClick={addNote} className="h-8 text-xs">
                    <Send className="h-3 w-3 me-1.5 rtl:rotate-180" /> {t("deals.post_comment")}
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
              <CardTitle className="text-sm font-bold">{t("deals.ledger_info")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <Row label={t("deals.deal_ref")} value={<span className="font-bold text-slate-850 dark:text-white">{deal.reference}</span>} />
              <Row label={t("deals.client_account")} value={<span className="font-semibold text-slate-850 dark:text-white">{deal.customerName}</span>} />
              <Row label={t("deals.sales_agent")} value={deal.salesmanName} />
              <Row label={t("deals.created_on")} value={formatDateTime(deal.dealDate)} />
              {deal.expectedPaymentDate && <Row label={t("deals.payment_target")} value={formatDateTime(deal.expectedPaymentDate)} />}
              <Row label={t("deals.invoice_total")} value={<span className="font-bold text-indigo-600 dark:text-indigo-400">{formatEGP(deal.total)}</span>} />
              <Row label={t("deals.collected_total")} value={<span className="font-bold text-emerald-600 dark:text-emerald-400">{formatEGP(deal.amountPaid)}</span>} />
              <Row
                label={t("deals.clearing_status")}
                value={
                  <Badge variant={deal.paymentStatus === "paid" ? "default" : deal.paymentStatus === "partial" ? "secondary" : "destructive"} className="text-[10px] px-2">
                    {t(`deals.payment_status.${deal.paymentStatus}`)}
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
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> {t("deals.settle_transaction")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-slate-500">{t("deals.status")}</Label>
                  <Select value={paymentStatus} onValueChange={(v: PaymentStatus) => setPaymentStatus(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">{t("deals.payment_status.unpaid")}</SelectItem>
                      <SelectItem value="partial">{t("deals.payment_status.partial")}</SelectItem>
                      <SelectItem value="paid">{t("deals.payment_status.paid")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <Label className="text-[10px] font-semibold text-slate-500">{t("deals.receipt_deposit")}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs flex-1"
                    />
                    {deal.total - amountPaid > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 text-xs whitespace-nowrap text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => {
                          setAmountPaid(deal.total);
                          setPaymentStatus("paid");
                        }}
                      >
                        Pay Rest
                      </Button>
                    )}
                  </div>
                  {deal.total - amountPaid > 0 && (
                    <div className="text-[10.5px] text-slate-500 text-right mt-1">
                      Remaining to pay: <span className="font-bold text-rose-500">{formatEGP(deal.total - amountPaid)}</span>
                    </div>
                  )}
                </div>
                <Button className="w-full h-9 text-xs shadow-md shadow-emerald-500/10 mt-2" onClick={savePayment}>
                  {t("deals.commit_settlement")}
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
