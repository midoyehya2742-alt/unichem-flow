import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { newId } from "@/lib/store";
import { useCustomers, useProducts, useSettings, useUpsertCustomer } from "@/hooks/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, X, AlertTriangle, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { formatEGP } from "@/lib/format";
import type { Customer, DealLine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface DealFormData {
  customerId: string;
  dealDate: string;
  expectedPaymentDate: string;
  lines: DealLine[];
  discount: number;
  tax: number;
  notes: string;
  paymentType: "immediate" | "installments";
  paymentMethod: "cash" | "cheques";
  paymentInfo: string;
  immediateAmount: number;
  cheques: { id: string; amount: number; dueDate: string }[];
  amountPaid: number;
  attachments: File[];
}

export interface DealFormProps {
  initialData?: Partial<DealFormData>;
  draftKey: string;
  mode: "create" | "edit";
  isSubmitting: boolean;
  onSubmit: (data: DealFormData, overrideStock: boolean) => Promise<void>;
  onCancel: () => void;
}

export function DealForm({ initialData, draftKey, mode, isSubmitting, onSubmit, onCancel }: DealFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation("common");

  const { data: customersData } = useCustomers();
  const { data: productsData } = useProducts();
  const { data: settingsData } = useSettings();
  const customers = useMemo(() => (customersData ?? []).filter(c => !c.archived), [customersData]);
  const products = useMemo(() => (productsData ?? []).filter(p => !p.archived), [productsData]);
  const settings = settingsData ?? { companyName: "UniChem ERP", defaultTax: 14, currency: "EGP" as const };

  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [dealDate, setDealDate] = useState(initialData?.dealDate || new Date().toISOString().slice(0, 10));
  const [expectedPaymentDate, setExpectedPaymentDate] = useState(initialData?.expectedPaymentDate || "");
  const [lines, setLines] = useState<DealLine[]>(initialData?.lines?.length ? initialData.lines : [{ productId: "", productName: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const [discount, setDiscount] = useState(initialData?.discount || 0);
  const [tax, setTax] = useState(initialData?.tax ?? settings.defaultTax);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [paymentType, setPaymentType] = useState<"immediate" | "installments">(initialData?.paymentType || "immediate");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "cheques">(initialData?.paymentMethod || "cash");
  const [paymentInfo, setPaymentInfo] = useState(initialData?.paymentInfo || "");
  const [immediateAmount, setImmediateAmount] = useState<number>(initialData?.immediateAmount || 0);
  const [cheques, setCheques] = useState<{ id: string; amount: number; dueDate: string }[]>(initialData?.cheques || []);
  const [amountPaid, setAmountPaid] = useState(initialData?.amountPaid || 0);
  const [attachments, setAttachments] = useState<File[]>(initialData?.attachments || []);

  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [overrideStock, setOverrideStock] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Auto-load draft on mount if creating
  useEffect(() => {
    if (initialized) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomerId(parsed.customerId || customerId);
        setDealDate(parsed.dealDate || dealDate);
        setExpectedPaymentDate(parsed.expectedPaymentDate || expectedPaymentDate);
        setLines(parsed.lines || lines);
        setDiscount(parsed.discount || discount);
        setTax(parsed.tax ?? tax);
        setNotes(parsed.notes || notes);
        setPaymentType(parsed.paymentType || paymentType);
        setPaymentMethod(parsed.paymentMethod || paymentMethod);
        setPaymentInfo(parsed.paymentInfo || paymentInfo);
        setImmediateAmount(parsed.immediateAmount || immediateAmount);
        setCheques(parsed.cheques || cheques);
        if (mode === "create") {
          toast.info("Draft restored from local session");
        }
      }
    } catch (e) {
      console.error("Failed to restore draft", e);
    } finally {
      setInitialized(true);
    }
  }, [draftKey, mode, initialized, customerId, dealDate, expectedPaymentDate, lines, discount, tax, notes, paymentType, paymentMethod, paymentInfo, immediateAmount, cheques]);

  // Hydrate from initialData once per deal (for edit mode). initialData is a
  // fresh object literal on every render of the parent, so keying off its
  // identity would re-run this on any parent re-render (e.g. a background
  // TanStack Query refetch on window focus) and silently clobber whatever the
  // user is currently typing. draftKey is stable per-deal, so use that instead.
  const hydratedDraftKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialData || !initialized) return;
    if (hydratedDraftKeyRef.current === draftKey) return;
    hydratedDraftKeyRef.current = draftKey;

    setCustomerId(initialData.customerId || customerId);
    setDealDate(initialData.dealDate || dealDate);
    setExpectedPaymentDate(initialData.expectedPaymentDate || expectedPaymentDate);
    setLines(initialData.lines?.length ? initialData.lines : lines);
    setDiscount(initialData.discount || discount);
    setTax(initialData.tax ?? tax);
    setNotes(initialData.notes || notes);
    setPaymentType(initialData.paymentType || paymentType);
    setPaymentMethod(initialData.paymentMethod || paymentMethod);
    setPaymentInfo(initialData.paymentInfo || paymentInfo);
    setImmediateAmount(initialData.immediateAmount || immediateAmount);
    setCheques(initialData.cheques || cheques);
    setAmountPaid(initialData.amountPaid || amountPaid);
  }, [draftKey, initialized, initialData]);

  // Auto-save draft on form edits
  const saveDraft = () => {
    try {
      if (!initialized) return;
      const draft = { customerId, dealDate, expectedPaymentDate, lines, discount, tax, notes, paymentType, paymentMethod, paymentInfo, immediateAmount, cheques, amountPaid };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {
      console.error("Failed to save draft", e);
    }
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

  const addCheque = () => {
    setCheques((prev) => [...prev, { id: newId(), amount: 0, dueDate: "" }]);
    setTimeout(saveDraft, 0);
  };

  const removeCheque = (id: string) => {
    setCheques((prev) => prev.filter((c) => c.id !== id));
    setTimeout(saveDraft, 0);
  };

  const updateCheque = (id: string, patch: any) => {
    setCheques((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setTimeout(saveDraft, 0);
  };

  const handleSubmit = () => {
    if (!user || isSubmitting) return;
    if (!customerId) return toast.error("Please select a customer");
    if (!lines.length || lines.some((l) => !l.productId || l.quantity <= 0)) {
      return toast.error("Please add at least one line item with valid product and quantity");
    }
    if (stockWarnings.length > 0 && !(user.role === "admin" && overrideStock)) {
      return toast.error("Cannot submit deal: Insufficient inventory.");
    }
    
    onSubmit({
      customerId, dealDate, expectedPaymentDate, lines, discount, tax, notes, paymentType, paymentMethod, paymentInfo, immediateAmount, cheques, amountPaid, attachments
    }, overrideStock);
  };

  return (
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
                      value={line.quantity === 0 ? "" : line.quantity}
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
                      value={line.unitPrice === 0 ? "" : line.unitPrice}
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
                      value={line.discount === 0 ? "" : line.discount}
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

        {/* Payment Method & Notes */}
        <div className="grid sm:grid-cols-2 gap-5">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">3. Payment Method</CardTitle>
              <CardDescription className="text-[10px]">Select payment terms and provide details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Payment Type</Label>
                <Select value={paymentType} onValueChange={(val: any) => { setPaymentType(val); setTimeout(saveDraft, 0); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate Payment</SelectItem>
                    <SelectItem value="installments">Installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(val: any) => { setPaymentMethod(val); setTimeout(saveDraft, 0); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheques">Cheques</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Payment Details (e.g. Bank, Customer Info)</Label>
                <Textarea
                  rows={2}
                  placeholder="Enter payment details..."
                  value={paymentInfo}
                  onChange={(e) => { setPaymentInfo(e.target.value); setTimeout(saveDraft, 0); }}
                  className="text-xs placeholder-slate-400 focus-visible:ring-indigo-500 resize-none"
                />
              </div>

              {paymentType === "installments" && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Immediate Down Payment</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={immediateAmount === 0 ? "" : immediateAmount}
                      onChange={(e) => { setImmediateAmount(parseFloat(e.target.value) || 0); setTimeout(saveDraft, 0); }}
                      className="h-9 text-xs"
                    />
                  </div>

                  {paymentMethod === "cheques" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-500">Post-dated Cheques</Label>
                        <Button size="sm" variant="outline" onClick={addCheque} className="h-7 text-[10px]">
                          <Plus className="h-3 w-3 mr-1" /> Add Cheque
                        </Button>
                      </div>
                      {cheques.length === 0 ? (
                        <div className="text-center text-[10px] text-slate-400">No cheques added.</div>
                      ) : (
                        <div className="space-y-2">
                          {cheques.map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={c.amount === 0 ? "" : c.amount}
                                onChange={(e) => updateCheque(c.id, { amount: parseFloat(e.target.value) || 0 })}
                                className="h-8 text-xs w-24"
                              />
                              <Input
                                type="date"
                                value={c.dueDate}
                                onChange={(e) => updateCheque(c.id, { dueDate: e.target.value })}
                                className="h-8 text-xs flex-1"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeCheque(c.id)}
                                className="h-8 w-8 text-rose-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Installment Sum:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatEGP(immediateAmount + cheques.reduce((s, c) => s + c.amount, 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
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

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm sm:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Attachments</CardTitle>
              <CardDescription className="text-[10px]">Upload supporting documents (invoices, receipts, POs)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input 
                  type="file" 
                  multiple 
                  onChange={(e) => {
                    if (e.target.files) {
                      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                      // We don't save File objects to localStorage draft
                    }
                  }} 
                  className="text-xs h-9 cursor-pointer file:text-xs file:bg-indigo-50 file:text-indigo-700 file:border-0 file:mr-3 file:px-3 file:py-1 file:rounded-full dark:file:bg-indigo-500/10 dark:file:text-indigo-400" 
                />
                {attachments.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2 mt-3">
                    {attachments.map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-lg">
                        <span className="truncate font-medium text-slate-700 dark:text-slate-300 pr-2">{f.name}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500 shrink-0" onClick={() => setAttachments(a => a.filter((_, idx) => idx !== i))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                    value={discount === 0 ? "" : discount}
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
                    value={tax === 0 ? "" : tax}
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
              <Button className="w-full shadow-lg shadow-indigo-600/10" onClick={handleSubmit} disabled={isSubmitting}>
                <FileCheck className="h-4 w-4 me-2" /> {t("deals.route_to_ledger")}
              </Button>
              <Button variant="outline" className="w-full text-xs" onClick={onCancel}>
                {t("deals.discard_entry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewCustomerDialog({
  open, setOpen, onCreated,
}: { open: boolean; setOpen: (v: boolean) => void; onCreated: (c: Customer) => void }) {
  const upsertCustomer = useUpsertCustomer();
  const { t } = useTranslation("common");
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", address: "" });

  const create = () => {
    if (!form.name.trim()) return toast.error("Customer name is required");
    const c: Customer = { id: newId(), ...form, archived: false, createdAt: new Date().toISOString() };
    // Only select the new customer into the deal once it actually persists —
    // otherwise the deal would reference a customer id that failed to insert.
    upsertCustomer.mutate(c, {
      onSuccess: () => {
        toast.success("Customer directories updated");
        setForm({ name: "", company: "", phone: "", email: "", address: "" });
        onCreated(c);
      },
    });
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
