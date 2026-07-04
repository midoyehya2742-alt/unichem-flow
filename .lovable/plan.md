# UniChem ERP — UI/UX Enhancement Pass

Focused, high-impact changes across the four areas. No business-logic or backend changes — presentation only, plus a couple of small store selectors where needed for aging/cash-flow.

## 1. Global (shared foundations — do first, everything else benefits)

**New shared components** (`src/components/ui/`):
- `empty-state.tsx` — icon + title + description + optional CTA. Used by lists (deals, customers, products, audit, notifications).
- `skeleton-list.tsx` and `skeleton-card.tsx` — consistent loading placeholders that respect card padding and dark mode.

**Design tokens** (`src/styles.css`):
- Dark-mode contrast pass: bump `--muted-foreground` and border tokens so secondary text and card edges are legible in dark mode.
- Add `--shadow-elegant`, `--gradient-primary`, `--gradient-accent`, `--surface-2` for reuse.
- New utility class `.glass-card` and `.stat-tile` for KPIs.

**Mobile nav polish** (`src/components/app-shell.tsx`):
- Bottom-safe padding, larger touch targets (min 44px), active-item indicator bar, hide sidebar on `< md` behind a slide-over that closes on route change.
- RTL-aware chevrons.

## 2. Salesman New-Deal form (`src/routes/deals.new.tsx`)

- **Searchable product picker** — replace the long `<Select>` per line with a `Command`-based combobox (search by name/SKU/category), showing stock + price inline. Keyboard: Up/Down + Enter selects.
- **Keyboard flow**:
  - `Alt+N` adds a new line and focuses its product field.
  - `Enter` in Qty / Unit Price / Discount advances to the next field; `Enter` on the last cell adds a new line.
  - `Cmd/Ctrl+S` submits.
- **Live totals sticky panel** — moves to a bottom sticky bar on mobile and a right-column sticky card on desktop, showing subtotal, discount, VAT, and grand total updating as you type.
- Compact stock warning inline chips (already amber; keep, refine spacing).

## 3. Deal detail (`src/routes/deals.$id.tsx`)

- **Settlement panel** — one clean card with: total, paid, remaining, progress bar, next expected payment. Replaces the current split payment inputs; input for adding a payment moves into a compact form at the bottom.
- **Activity timeline** — vertical timeline listing: created → edit-request(s) → approve/reject → payments → status changes. Sourced from `audit_logs` filtered by `entity='deal' AND entity_id=<id>`, plus `deal.editRequest` and payment history already on the deal.
- Better header: reference, customer, salesman, status pills with color tokens; sticky action bar (Approve edit / Reject / Add payment) on mobile.

## 4. Finance dashboard (`src/routes/dashboard.tsx`)

Finance/admin view only (salesman view unchanged in structure):
- **KPI row (4 tiles)**: Total sales this month, Cash collected this month, Outstanding AR, Overdue > 30d. Each with delta vs prior month.
- **Aging buckets** — small horizontal bar chart: `0-30 / 31-60 / 61-90 / 90+` days past `expectedPaymentDate` for unpaid/partial deals; click a bucket to filter deals list.
- **Cash-flow chart** — `recharts` composed bar+line: last 6 months of `sales` (bar) vs `collected` (line).
- **Pending edit-requests** widget cleaned up (already exists) — reuse the empty-state component.

## 5. Not in scope

- No schema changes, no new RPCs.
- No i18n key additions (existing English fallbacks used for new UI strings).
- No new routes.
- Recharts already installed — no new deps.

## Technical notes

- `Command` from `cmdk` is already installed (`src/components/ui/command`).
- Aging + cash-flow derived in-component from `db.listDeals()` — no DB round-trips added.
- All new color usage goes through semantic tokens (`bg-card`, `text-muted-foreground`, `text-primary`, etc.) — no hardcoded hex.
- Timeline uses `audit_logs` via existing `db.listAudit()` selector; add a `listAuditForDeal(id)` helper if not present.

## Execution order

1. Global tokens + shared components (Empty/Skeleton, mobile nav).
2. Dashboard (finance KPIs, aging, cash-flow).
3. Deal detail (settlement, timeline).
4. New-deal form (product combobox, keyboard, sticky totals).

Reply "go" to execute all four, or tell me which sections to drop/reduce.
