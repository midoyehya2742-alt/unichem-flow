import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { newId, nextRef, nowIso, useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Paperclip, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatEGP } from "@/lib/format";
import type { Attachment, Customer, DealLine } from "@/lib/types";

export const Route = createFileRoute("/deals/new")({
  head: () => ({ meta: [{ title: "New Deal — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["salesman", "admin"]}><NewDeal /></RequireAuth>,
});

const MAX_BYTES = 10 * 1024 * 1024;

function NewDeal() {
  const { user } = useAuth();
  const db = useDb();
  const navigate = useNavigate();

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0);
    const afterDisc = subtotal * (1 - (discount || 0) / 100);
    const total = afterDisc * (1 + (tax || 0) / 100);
    return { subtotal, total };
  }, [lines, discount, tax]);

  const updateLine = (i: number, patch: Partial<DealLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));
  const addLine = () => setLines((prev) => [...prev, { productId: "", productName: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const pickProduct = (i: number, pid: string) => {
    const p = products.find((x) => x.id === pid);
    if (!p) return;
    updateLine(i, { productId: p.id, productName: p.name, unitPrice: p.defaultPrice });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const accepted = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (!accepted.includes(f.type)) { toast.error(`${f.name}: only PDF, JPG, PNG allowed`); continue; }
      if (f.size > MAX_BYTES) { toast.error(`${f.name}: exceeds 10MB`); continue; }
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      next.push({ id: newId(), name: f.name, size: f.size, type: f.type, dataUrl });
    }
    setAttachments((p) => [...p, ...next]);
  };

  const submit = () => {
    if (!user) return;
    if (!customerId) return toast.error("Select a customer");
    if (!lines.length || lines.some((l) => !l.productId || l.quantity <= 0)) {
      return toast.error("Add at least one product with quantity");
    }
    const customer = customers.find((c) => c.id === customerId)!;
    const ref = nextRef();
    db.createDeal({
      id: newId(),
      reference: ref,
      salesmanId: user.id,
      salesmanName: user.name,
      customerId: customer.id,
      customerName: customer.name,
      lines,
      subtotal: totals.subtotal,
      discount, tax,
      total: totals.total,
      currency: "EGP",
      paymentStatus: "unpaid",
      amountPaid: 0,
      dealStatus: "pending",
      notes,
      financeNotes: [],
      attachments,
      dealDate: new Date(dealDate).toISOString(),
      expectedPaymentDate: expectedPaymentDate ? new Date(expectedPaymentDate).toISOString() : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    toast.success(`Deal ${ref} submitted`);
    navigate({ to: "/deals" });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="New Deal" description="Submit a sales deal for Finance review." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                <NewCustomerDialog
                  open={newCustomerOpen} setOpen={setNewCustomerOpen}
                  onCreated={(c) => { setCustomerId(c.id); setNewCustomerOpen(false); }}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Deal date</Label>
                  <Input type="date" value={dealDate} onChange={(e) => setDealDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected payment date</Label>
                  <Input type="date" value={expectedPaymentDate} onChange={(e) => setExpectedPaymentDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line items</CardTitle>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Add line</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lines.map((line, i) => {
                const subtotal = line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Select value={line.productId} onValueChange={(v) => pickProduct(i, v)}>
                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={0} step="0.01" value={line.quantity} onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Unit price</Label>
                      <Input type="number" min={0} step="0.01" value={line.unitPrice} onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-3 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Disc %</Label>
                      <Input type="number" min={0} max={100} value={line.discount} onChange={(e) => updateLine(i, { discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="col-span-12 text-right text-xs text-muted-foreground">
                      Subtotal: <span className="font-medium text-foreground">{formatEGP(subtotal)}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>PDF, JPG, PNG up to 10MB each</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-center border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:bg-accent/30 transition">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
                <div className="text-center text-sm text-muted-foreground">
                  <Paperclip className="h-5 w-5 mx-auto mb-1" />
                  Click to upload files
                </div>
              </label>
              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                      <span className="truncate">{a.name} <span className="text-xs text-muted-foreground">({(a.size / 1024).toFixed(0)} KB)</span></span>
                      <Button size="icon" variant="ghost" onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={3} placeholder="Any details Finance should know…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-medium">{formatEGP(totals.subtotal)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Discount %</Label>
                  <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax %</Label>
                  <Input type="number" min={0} max={100} value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="border-t pt-3 flex justify-between items-end">
                <span className="text-sm text-muted-foreground">Total (EGP)</span>
                <span className="text-2xl font-bold">{formatEGP(totals.total)}</span>
              </div>
              <Button className="w-full" onClick={submit}>Submit deal</Button>
              <Button className="w-full" variant="outline" onClick={() => navigate({ to: "/deals" })}>Cancel</Button>
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
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", address: "" });
  const create = () => {
    if (!form.name.trim()) return toast.error("Customer name required");
    const c: Customer = { id: newId(), ...form, archived: false, createdAt: nowIso() };
    db.upsertCustomer(c);
    toast.success("Customer added");
    setForm({ name: "", company: "", phone: "", email: "", address: "" });
    onCreated(c);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" type="button"><Plus className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create}>Add customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
