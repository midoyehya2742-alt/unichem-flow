import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, nextRef, nowIso, uploadDealFiles } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DealForm, type DealFormData } from "@/components/deals/deal-form";
import { useCustomers, useCreateDeal } from "@/hooks/queries";

export const Route = createFileRoute("/deals/new")({
  head: () => ({ meta: [{ title: "New Deal — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["salesman", "admin"]}><NewDeal /></RequireAuth>,
});

const DRAFT_KEY = "unichem-new-deal-draft";

function NewDeal() {
  const { user } = useAuth();
  const { data: customersData } = useCustomers();
  const createDeal = useCreateDeal();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const customers = customersData ?? [];
  const [submitting, setSubmitting] = useState(false);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleCancel = () => {
    clearDraft();
    navigate({ to: "/deals" });
  };

  const handleSubmit = async (data: DealFormData, overrideStock: boolean) => {
    if (!user || submitting) return;

    const customer = customers.find((c) => c.id === data.customerId);
    if (!customer) {
      toast.error("Selected customer no longer exists. Please pick another.");
      return;
    }
    const ref = nextRef();
    const dealId = newId();
    setSubmitting(true);

    let finalAmountPaid = 0;
    let finalPaymentStatus: "paid" | "partial" | "unpaid" = "unpaid";

    const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0);
    const afterDisc = subtotal * (1 - (data.discount || 0) / 100);
    const totalsTotal = afterDisc * (1 + (data.tax || 0) / 100);

    if (data.paymentType === "immediate") {
       finalAmountPaid = totalsTotal;
       finalPaymentStatus = "paid";
    } else {
       finalAmountPaid = data.immediateAmount || 0;
       if (finalAmountPaid >= totalsTotal && totalsTotal > 0) {
          finalPaymentStatus = "paid";
       } else if (finalAmountPaid > 0) {
          finalPaymentStatus = "partial";
       }
    }

    // Upload attachments first; surface upload errors on their own (they happen
    // before the mutation, so the mutation's onError won't cover them).
    let uploadedAttachments: Awaited<ReturnType<typeof uploadDealFiles>> = [];
    try {
      if (data.attachments && data.attachments.length > 0) {
        const pending = data.attachments.map(f => ({
          id: newId(), name: f.name, size: f.size, type: f.type, file: f,
        }));
        uploadedAttachments = await uploadDealFiles(dealId, pending);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to upload attachments");
      setSubmitting(false);
      return;
    }

    // The `reference` here is a placeholder — a DB trigger replaces any DL-*
    // value with the real sequenced reference, so we don't echo it back.
    createDeal.mutate({ deal: {
      id: dealId,
      reference: ref,
      salesmanId: user.id,
      salesmanName: user.name,
      customerId: customer.id,
      customerName: customer.name,
      lines: data.lines,
      subtotal,
      discount: data.discount,
      tax: data.tax,
      total: totalsTotal,
      currency: "EGP",
      paymentStatus: finalPaymentStatus,
      amountPaid: finalAmountPaid,
      dealStatus: "pending",
      notes: data.notes,
      financeNotes: [],
      attachments: uploadedAttachments,
      paymentType: data.paymentType,
      paymentMethod: data.paymentMethod,
      paymentInfo: data.paymentInfo,
      immediateAmount: data.paymentType === "installments" ? data.immediateAmount : undefined,
      cheques: data.paymentType === "installments" && data.paymentMethod === "cheques" ? data.cheques : undefined,
      dealDate: new Date(data.dealDate).toISOString(),
      expectedPaymentDate: data.expectedPaymentDate ? new Date(data.expectedPaymentDate).toISOString() : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }, overrideStock: user.role === "admin" && overrideStock }, {
      onSuccess: () => { clearDraft(); toast.success("Deal submitted successfully!"); navigate({ to: "/deals" }); },
      onSettled: () => setSubmitting(false),
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("deals.new_title")}
        description={t("deals.new_desc")}
      />
      <DealForm
        draftKey={DRAFT_KEY}
        mode="create"
        isSubmitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
