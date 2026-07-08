import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, uploadDealFiles } from "@/lib/store";
import { useCustomers, useDeals, useUpdateDealFull } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DealForm, type DealFormData } from "@/components/deals/deal-form";

export const Route = createFileRoute("/deals/$id_/edit")({
  head: () => ({ meta: [{ title: "Edit Deal — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["finance", "admin", "salesman"]}><EditDeal /></RequireAuth>,
});

function EditDeal() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: customersData } = useCustomers();
  const { data: dealsData } = useDeals();
  const updateDealFull = useUpdateDealFull();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const customers = customersData ?? [];
  const deal = dealsData?.find((d) => d.id === id);

  const [submitting, setSubmitting] = useState(false);

  // Guard: salesman can only edit their own approved deals, and only after
  // Finance/Admin approved an edit request — matches the check enforced by
  // update_deal_with_inventory, so this catches the case early with a clear
  // message instead of surfacing a raw RPC error.
  if (deal && user?.role === "salesman" && deal.dealStatus !== "approved") {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Editing Not Available</h2>
        <p className="text-xs text-slate-500">This deal must be <strong>approved by finance or an admin</strong> before you can edit it. Its current status is <strong className="capitalize">{deal.dealStatus}</strong>.</p>
        <Button variant="outline" className="w-full text-xs" onClick={() => navigate({ to: `/deals/${id}` })}>
          ← Back to Deal
        </Button>
      </div>
    );
  }
  if (deal && user?.role === "salesman" && deal.editRequest?.status !== "approved") {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center mx-auto">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Edit Request Required</h2>
        <p className="text-xs text-slate-500">
          You can't edit a deal directly — go back and submit an <strong>edit request</strong> first. You'll be able to edit once Finance or an Admin approves it.
        </p>
        <Button variant="outline" className="w-full text-xs" onClick={() => navigate({ to: `/deals/${id}` })}>
          ← Back to Deal
        </Button>
      </div>
    );
  }

  const DRAFT_KEY = `unichem-edit-deal-${id}`;

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleCancel = () => {
    clearDraft();
    navigate({ to: `/deals/${id}` });
  };

  const handleSubmit = async (data: DealFormData, overrideStock: boolean) => {
    if (!user || submitting || !deal) return;

    const customer = customers.find((c) => c.id === data.customerId);
    if (!customer) {
      toast.error("Selected customer no longer exists. Please pick another.");
      return;
    }
    setSubmitting(true);

    const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0);
    const afterDisc = subtotal * (1 - (data.discount || 0) / 100);
    const totalsTotal = afterDisc * (1 + (data.tax || 0) / 100);

    // Editing line items / totals must NOT silently rewrite what finance has
    // already collected. Preserve the recorded amount paid and re-derive the
    // payment status from it against the new total.
    const finalAmountPaid = deal.amountPaid || 0;
    let finalPaymentStatus: "paid" | "partial" | "unpaid";
    if (finalAmountPaid <= 0) {
      finalPaymentStatus = "unpaid";
    } else if (totalsTotal > 0 && finalAmountPaid >= totalsTotal) {
      finalPaymentStatus = "paid";
    } else {
      finalPaymentStatus = "partial";
    }

    // Upload attachments first; surface upload errors on their own (they happen
    // before the mutation, so the mutation's onError won't cover them).
    let attachments = deal.attachments;
    try {
      if (data.attachments && data.attachments.length > 0) {
        const pending = data.attachments.map(f => ({
          id: newId(), name: f.name, size: f.size, type: f.type, file: f,
        }));
        const uploaded = await uploadDealFiles(deal.id, pending);
        attachments = [...deal.attachments, ...uploaded];
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to upload attachments");
      setSubmitting(false);
      return;
    }

    updateDealFull.mutate({ newDeal: {
      ...deal,
      customerId: customer.id,
      customerName: customer.name,
      lines: data.lines,
      subtotal,
      discount: data.discount,
      tax: data.tax,
      total: totalsTotal,
      paymentStatus: finalPaymentStatus,
      amountPaid: finalAmountPaid,
      notes: data.notes,
      attachments,
      paymentType: data.paymentType,
      paymentMethod: data.paymentMethod,
      paymentInfo: data.paymentInfo,
      immediateAmount: data.paymentType === "installments" ? data.immediateAmount : undefined,
      cheques: data.paymentType === "installments" && data.paymentMethod === "cheques" ? data.cheques : undefined,
      dealDate: new Date(data.dealDate).toISOString(),
      expectedPaymentDate: data.expectedPaymentDate ? new Date(data.expectedPaymentDate).toISOString() : undefined,
    }, overrideStock: user.role === "admin" && overrideStock }, {
      onSuccess: () => { clearDraft(); toast.success(`Deal ${deal.reference} updated successfully!`); navigate({ to: `/deals/${id}` }); },
      onSettled: () => setSubmitting(false),
    });
  };

  if (!deal) return <div className="p-8 text-center text-slate-500">Loading deal...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Edit Deal"
        description={`Modifying deal ${deal.reference}`}
      />
      <DealForm
        draftKey={DRAFT_KEY}
        mode="edit"
        initialData={{
          customerId: deal.customerId,
          dealDate: deal.dealDate ? new Date(deal.dealDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          expectedPaymentDate: deal.expectedPaymentDate ? new Date(deal.expectedPaymentDate).toISOString().slice(0, 10) : "",
          lines: deal.lines,
          discount: deal.discount,
          tax: deal.tax,
          notes: deal.notes,
          paymentType: deal.paymentType,
          paymentMethod: deal.paymentMethod,
          paymentInfo: deal.paymentInfo,
          immediateAmount: deal.immediateAmount,
          cheques: deal.cheques,
          amountPaid: deal.amountPaid,
        }}
        isSubmitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
