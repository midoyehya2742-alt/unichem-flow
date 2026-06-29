import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, nextRef, nowIso, useDb, type PendingAttachment } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Paperclip, X, AlertTriangle, FileCheck } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { formatEGP } from "@/lib/format";
import type { Customer, DealLine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/deals/edit")({
  head: () => ({ meta: [{ title: "New Deal — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["salesman", "admin"]}><NewDeal /></RequireAuth>,
});

const MAX_BYTES = 10 * 1024 * 1024;
const DRAFT_KEY = "unichem-new-deal-draft";

function NewDeal() {
  const { user } = useAuth();
  const db = useDb();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const customers = db.listCustomers();
  const products = db.listProducts();
  const settings = db.getSettings();

  const [customerId, setCustomerId] = useState("");
  const [dealDate, setDealDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
  const [lines, setLines] = useState<DealLine[]>([
    { productId: "", productName: "", quantity: 1, unitPrice: 0, discount: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(settings.defaultTax);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [overrideStock, setOverrideStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomerId(parsed.customerId || "");
        setDealDate(parsed.dealDate || new Date().toISOString().slice(0, 10));
        setExpectedPaymentDate(parsed.expectedPaymentDate || "");
        setLines(parsed.lines || [{ productId: "", productName: "", quantity: 1, unitPrice: 0, discount: 0 }]);
        setDiscount(parsed.discount || 0);
        setTax(parsed.tax ?? settings.defaultTax);
        setNotes(parsed.notes || "");
        toast.info("Draft restored from local session");
      }
    } catch (e) {
      console.error("Failed to restore draft", e);
    }
  }, [settings.defaultTax]);

  // Auto-save draft on form edits
  const saveDraft = () => {
    try {
      const draft = { customerId, dealDate, expectedPaymentDate, lines, discount, tax, notes };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.error("Failed to save draft", e);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0);
    const afterDisc = subtotal * (1 - (discount || 0) / 100);
    const total = afterDisc * (1 + (tax || 0) / 100);
    return { subtotal, total };
  }, [lines, discount, tax]);

  const stockWarnings = useMemo(() => lines.flatMap((line) => {
    if (!line.productId || line.quantity <= 0) return [];
    const p = products.find((x) => x.id === line.productId);
    if (!p || p.stockQuantity >= line.quantity) return [];
    return [`${p.name}: requested ${line.quantity} ${p.unit}, available ${p.stockQuantity} ${p.unit}`];
  }), [lines, products]);

  const updateLine = (i: number, patch: Partial<DealLine>) => {
    setLines((prev) => {
      const next = prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
      setTimeout(saveDraft, 0);
      return next;
    });
  };

  const removeLine = (i: number) => {
    setLines((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      setTimeout(saveDraft, 0);
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => {
      const next = [...prev, { productId: "", productName: "", quantity: 1, unitPrice: 0, discount: 0 }];
      setTimeout(saveDraft, 0);
      return next;
    });
  };

  const pickProduct = (i: number, pid: string) => {
    const p = products.find((x) => x.id === pid);
    if (!p) return;
    updateLine(i, { productId: p.id, productName: p.name, unitPrice: p.defaultPrice });
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    const next: PendingAttachment[] = [];
    for (const f of Array.from(fileList)) {
      if (!accepted.includes(f.type)) {
        toast.error(`${f.name}: Only PDF, JPG, PNG allowed`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: Exceeds 10MB limit`);
        continue;
      }
      // Keep the raw File; it is uploaded to Storage on submit (once we have a deal id).
      next.push({ id: newId(), name: f.name, size: f.size, type: f.type, file: f });
    }
    setAttachments((p) => [...p, ...next]);
    if (next.length) toast.success(`${next.length} attachment(s) added`);
  };

  const submit = async () => {
    if (!user || submitting) return;
    if (!customerId) return toast.error("Please select a customer");
    if (!lines.length || lines.some((l) => !l.productId || l.quantity <= 0)) {
      return toast.error("Please add at least one line item with valid product and quantity");
    }
    if (stockWarnings.length > 0 && !(user.role === "admin" && overrideStock)) {
      return toast.error("Cannot submit deal: Insufficient inventory.");
    }
    const customer = customers.find((c) => c.id === customerId)!;
    const ref = nextRef();
    const dealId = newId();
    setSubmitting(true);
    try {
      // Upload attachments to Storage first so the deal stores their paths.
      const uploaded = attachments.length ? await db.uploadDealFiles(dealId, attachments) : [];
      db.createDeal({
        id: dealId,
        reference: ref,
        salesmanId: user.id,
        salesmanName: user.name,
        customerId: customer.id,
        customerName: customer.name,
        lines,
        subtotal: totals.subtotal,
        discount,
        tax,
        total: totals.total,
        currency: "EGP",
        paymentStatus: "unpaid",
        amountPaid: 0,
        dealStatus: "pending",
        notes,
        financeNotes: [],
        attachments: uploaded,
        dealDate: new Date(dealDate).toISOString(),
        expectedPaymentDate: expectedPaymentDate ? new Date(expectedPaymentDate).toISOString() : undefined,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }, user.role === "admin" && overrideStock);

      clearDraft();
      toast.success(`Deal ${ref} submitted successfully!`);
      navigate({ to: "/deals" });
    } catch (error: any) {
      toast.error(error.message || "Error submitting transaction record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("deals.new_title")}
        description={t("deals.new_desc")}
        actions={
          <Button variant="outline" size="sm" onClick={() => { clearDraft(); navigate({ to: "/deals" }); }} className="h-9 text-xs">
            {t("common.actions.cancel")}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Details Area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer Selection Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">{t("deals.step1_title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">{t("deals.customer_name")}</Label>
                <div className="flex gap-2">
                  <Select value={customerId} onValueChange={(val) => { setCustomerId(val); setTimeout(saveDraft, 0); }}>
                    <SelectTrigger className="flex-1 h-10 text-xs">
                      <SelectValue placeholder={t("deals.search_customer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <NewCustomerDialog
                    open={newCustomerOpen}
                    setOpen={setNewCustomerOpen}
                    onCreated={(c) => { setCustomerId(c.id); setNewCustomerOpen(false); saveDraft(); }}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">{t("deals.deal_date")}</Label>
                  <Input type="date" value={dealDate} onChange={(e) => { setDealDate(e.target.value); setTimeout(saveDraft, 0); }} className="h-10 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">{t("deals.expected_payment_date")}</Label>
                  <Input type="date" value={expectedPaymentDate} onChange={(e) => { setExpectedPaymentDate(e.target.value); setTimeout(saveDraft, 0); }} className="h-10 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold">{t("deals.step2_title")}</CardTitle>
              <Button size="sm" variant="outline" onClick={addLine} className="h-8 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1 rtl:ml-1" /> {t("deals.add_product_line")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lines.map((line, i) => {
                const subtotal = line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100);
                const product = products.find((p) => p.id === line.productId);
                const low = Boolean(product && line.quantity > product.stockQuantity);
                return (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-12 gap-3 items-end border rounded-xl p-4 transition-all",
                      low ? "border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10" : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <div className="col-span-12 lg:col-span-5 space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">{t("deals.chemical_sku")}</Label>
                      <Select value={line.productId} onValueChange={(v) => pickProduct(i, v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder={t("deals.select_inventory")} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku}) - Avail: {p.stockQuantity} {p.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 sm:col-span-4 lg:col-span-2 space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">{t("deals.qty")}</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step="any"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-4 lg:col-span-2 space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">{t("deals.unit_price")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="col-span-9 sm:col-span-3 lg:col-span-2 space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">{t("deals.disc_pct")}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={line.discount}
                        onChange={(e) => updateLine(i, { discount: parseFloat(e.target.value) || 0 })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1 lg:col-span-1 flex items-center justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                        className="h-9 w-9 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="col-span-12 flex justify-between text-[10px] text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                      <span>
                        {product && (
                          <span className={cn(low ? "font-bold text-amber-600 dark:text-amber-400" : "")}>
                            {t("deals.warehouse_stock")} {product.stockQuantity} {product.unit}
                          </span>
                        )}
                      </span>
                      <span>
                        {t("deals.line_total")} <span className="font-bold text-slate-850 dark:text-white">{formatEGP(subtotal)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}

              {stockWarnings.length > 0 && (
                <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  <AlertTitle className="text-xs font-bold">{t("deals.insufficient_stock")}</AlertTitle>
                  <AlertDescription className="text-xs space-y-2 mt-1">
                    <ul className="list-disc pl-5 rtl:pr-5 rtl:pl-0 space-y-1">
                      {stockWarnings.map((w) => <li key={w}>{w}</li>)}
                    </ul>
                    {user?.role === "admin" && (
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <Checkbox checked={overrideStock} onCheckedChange={(checked) => setOverrideStock(Boolean(checked))} />
                        <span className="font-semibold text-[11px]">{t("deals.authorize_override")}</span>
                      </label>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Attachments & Notes */}
          <div className="grid sm:grid-cols-2 gap-5">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">{t("deals.step3_title")}</CardTitle>
                <CardDescription className="text-[10px]">{t("deals.step3_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragOver(false); processFiles(e.dataTransfer.files); }}
                  className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 cursor-pointer transition text-center",
                    isDragOver 
                      ? "border-indigo-500 bg-indigo-500/5" 
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
                  )}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                    multiple
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => processFiles(e.target.files)}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer space-y-1">
                    <Paperclip className="h-6 w-6 text-slate-400 mx-auto" />
                    <div className="text-xs font-semibold text-indigo-500">{t("deals.upload_attachment")}</div>
                    <div className="text-[10px] text-slate-400">{t("deals.or_drag_drop")}</div>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <ul className="space-y-1.5 pt-2">
                    {attachments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between text-xs border rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-slate-900">
                        <span className="truncate font-medium flex-1 mr-2">{a.name}</span>
                        <span className="text-[10px] text-slate-400 mr-2">({(a.size / 1024).toFixed(0)} KB)</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                          className="h-6 w-6 text-rose-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">{t("deals.step4_title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={4}
                  placeholder={t("deals.remarks_placeholder")}
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setTimeout(saveDraft, 0); }}
                  className="text-xs placeholder-slate-400 focus-visible:ring-indigo-500 resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Summary Pane */}
        <div className="space-y-4">
          <Card className="sticky top-20 border-slate-200 dark:border-slate-800 shadow-lg">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-sm font-bold">{t("deals.pipeline_value")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>{t("deals.gross_subtotal")}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatEGP(totals.subtotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">{t("deals.overall_disc_pct")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discount}
                      onChange={(e) => { setDiscount(parseFloat(e.target.value) || 0); setTimeout(saveDraft, 0); }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">{t("deals.global_tax_pct")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={tax}
                      onChange={(e) => { setTax(parseFloat(e.target.value) || 0); setTimeout(saveDraft, 0); }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-end">
                <span className="text-xs text-slate-500">{t("deals.cleared_net")}</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {formatEGP(totals.total)}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <Button className="w-full shadow-lg shadow-indigo-600/10" onClick={submit} disabled={submitting}>
                  <FileCheck className="h-4 w-4 me-2" /> {t("deals.route_to_ledger")}
                </Button>
                <Button variant="outline" className="w-full text-xs" onClick={() => navigate({ to: "/deals" })}>
                  {t("deals.discard_entry")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NewCustomerDialog({
  open, setOpen, onCreated,
}: { open: boolean; setOpen: (v: boolean) => void; onCreated: (c: Customer) => void }) {
  const db = useDb();
  const { t } = useTranslation("common");
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", address: "" });

  const create = () => {
    if (!form.name.trim()) return toast.error("Customer name is required");
    const c: Customer = { id: newId(), ...form, archived: false, createdAt: nowIso() };
    db.upsertCustomer(c);
    toast.success("Customer directories updated");
    setForm({ name: "", company: "", phone: "", email: "", address: "" });
    onCreated(c);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="h-10 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md font-sans dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{t("deals.add_customer_dir")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1"><Label className="text-slate-500">{t("deals.customer_name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-slate-500">{t("deals.company_name")}</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-slate-500">{t("deals.phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-slate-500">{t("deals.email")}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9" /></div>
          </div>
          <div className="space-y-1"><Label className="text-slate-500">{t("deals.billing_address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-9" /></div>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.actions.cancel")}</Button>
          <Button size="sm" onClick={create}>{t("deals.save_record")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
