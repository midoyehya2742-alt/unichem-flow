# UniChem ERP — Internal Sales & Finance Management System

Modern web app to replace paper forms, Excel and WhatsApp between **Sales**, **Finance** and **Admin** at UniChem.

> **Current state:** Full frontend is built and runnable. All data is stored in `localStorage` via `src/lib/store.ts`. The app is structured so swapping the mock store for Supabase is a localized change — see **Backend Integration** below.

---

## Stack

- **TanStack Start** (React 19 + Vite 7) — file-based routing in `src/routes/`
- **Tailwind v4** + **shadcn/ui** — design tokens in `src/styles.css`
- **Recharts** for dashboards & reports
- **Sonner** for toasts
- Mock store: `localStorage` (key `unichem.db.v1`)
- Currency: **EGP** throughout

## Features (v1)

- Email/password login, role-based access (admin / finance / salesman), session persistence
- **Salesman**: dashboard KPIs, "New Deal" form (multi-line, inline new-customer, attachments PDF/JPG/PNG ≤10MB, discount, tax, notes), my deals
- **Finance**: full deal list with search & filter, payment status updates, finance notes, CSV export
- **Admin**: users, products, customers (CRUD + archive), audit log, company settings
- **Reports**: top salesmen, top products, period filters, CSV export
- Print-friendly deal details, role-aware sidebar, mobile responsive

## Demo accounts (seeded automatically)

| Role     | Email                       | Password    |
| -------- | --------------------------- | ----------- |
| Admin    | midoyehya2742@gmail.com     | memo2742    |
| Finance  | finance@unichem.local       | finance123  |
| Salesman | sales@unichem.local         | sales123    |

Reset all local data from **Settings → Danger zone**.

---

## Project structure

```
src/
  routes/                  # file-based routes
    __root.tsx             # root layout, providers (Auth, QueryClient, Toaster)
    index.tsx              # redirects to /auth or /dashboard
    auth.tsx               # login page
    dashboard.tsx          # role-aware overview + KPIs/charts
    deals.index.tsx        # /deals — list + filters + CSV
    deals.new.tsx          # /deals/new — multi-line form
    deals.$id.tsx          # /deals/:id — details, payment, notes
    customers.tsx
    products.tsx
    users.tsx              # admin
    reports.tsx            # admin/finance
    audit.tsx              # admin
    settings.tsx           # admin
  components/
    app-shell.tsx          # sidebar layout + PageHeader
    require-auth.tsx       # role guard wrapper
    ui/                    # shadcn primitives
  lib/
    types.ts               # User, Deal, Customer, Product, AuditEntry…
    auth.tsx               # AuthProvider + useAuth (localStorage session)
    store.ts               # MOCK store (localStorage). Replace with Supabase.
    format.ts              # EGP / date formatters
  styles.css               # design tokens (UniChem navy + gold)
```

---

## Backend Integration (Supabase / Lovable Cloud)

Everything backend-facing is funneled through **`src/lib/store.ts`** and **`src/lib/auth.tsx`**. To migrate:

### 1. Enable Lovable Cloud / connect Supabase

Use Lovable's green Supabase button (top right) → "Connect existing project" → select your project. This generates `src/integrations/supabase/client.ts` automatically.

### 2. Run this schema migration

```sql
-- Enum for roles
create type public.app_role as enum ('admin', 'finance', 'salesman');

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Role table (NEVER store role on profiles — privilege escalation risk)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

-- Security-definer role check
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, company text, phone text, email text, address text, tax_id text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique, name text not null, unit text not null default 'kg',
  default_price numeric(12,2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create type public.payment_status as enum ('unpaid','partial','paid');
create type public.deal_status as enum ('pending','approved','rejected','delivered');

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  salesman_id uuid not null references auth.users(id),
  customer_id uuid not null references public.customers(id),
  lines jsonb not null,                -- array of {product_id, product_name, quantity, unit_price, discount}
  subtotal numeric(12,2) not null,
  discount numeric(5,2) not null default 0,
  tax numeric(5,2) not null default 14,
  total numeric(12,2) not null,
  currency text not null default 'EGP',
  payment_status payment_status not null default 'unpaid',
  amount_paid numeric(12,2) not null default 0,
  deal_status deal_status not null default 'pending',
  notes text,
  deal_date date not null default current_date,
  expected_payment_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deal_attachments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  name text not null, size int not null, mime text not null,
  storage_path text not null,          -- bucket: deal-attachments
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.finance_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  text text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null, entity text not null, entity_id uuid,
  details text,
  created_at timestamptz not null default now()
);

create table public.company_settings (
  id int primary key default 1,
  company_name text not null default 'UniChem',
  default_tax numeric(5,2) not null default 14,
  currency text not null default 'EGP',
  logo_url text,
  check (id = 1)
);
insert into public.company_settings (id) values (1) on conflict do nothing;

-- GRANTS (required — Data API blocks tables without explicit grants)
grant select on public.profiles, public.user_roles, public.customers, public.products,
  public.deals, public.deal_attachments, public.finance_notes, public.company_settings to authenticated;
grant insert, update on public.customers, public.products, public.deals,
  public.deal_attachments, public.finance_notes, public.profiles to authenticated;
grant select on public.audit_logs to authenticated;
grant all on all tables in schema public to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.deals enable row level security;
alter table public.deal_attachments enable row level security;
alter table public.finance_notes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.company_settings enable row level security;

-- Policies (examples — tighten as needed)
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "roles read self or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "all read customers/products" on public.customers for select to authenticated using (true);
create policy "all read products" on public.products for select to authenticated using (true);
create policy "auth write customers" on public.customers for insert to authenticated with check (true);
create policy "auth update customers" on public.customers for update to authenticated using (true);
create policy "finance/admin manage products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'finance'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'finance'));

create policy "deals read by role" on public.deals for select to authenticated using (
  salesman_id = auth.uid()
  or public.has_role(auth.uid(),'finance')
  or public.has_role(auth.uid(),'admin')
);
create policy "salesman insert own deals" on public.deals for insert to authenticated
  with check (salesman_id = auth.uid());
create policy "finance/admin update deals" on public.deals for update to authenticated using (
  public.has_role(auth.uid(),'finance') or public.has_role(auth.uid(),'admin')
);

create policy "attachments follow deal" on public.deal_attachments for select to authenticated using (
  exists (select 1 from public.deals d where d.id = deal_id
    and (d.salesman_id = auth.uid() or public.has_role(auth.uid(),'finance') or public.has_role(auth.uid(),'admin')))
);
create policy "attachments insert by owner" on public.deal_attachments for insert to authenticated
  with check (exists (select 1 from public.deals d where d.id = deal_id and d.salesman_id = auth.uid()));

create policy "notes read by deal" on public.finance_notes for select to authenticated using (true);
create policy "notes insert finance/admin/owner" on public.finance_notes for insert to authenticated
  with check (
    author_id = auth.uid() and (
      public.has_role(auth.uid(),'finance')
      or public.has_role(auth.uid(),'admin')
      or exists (select 1 from public.deals d where d.id = deal_id and d.salesman_id = auth.uid())
    )
  );

create policy "audit read admin" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "settings read all" on public.company_settings for select to authenticated using (true);
create policy "settings update admin" on public.company_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- Auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 3. Create Storage bucket

- Bucket name: `deal-attachments`
- Private. Policies: authenticated users can upload to `deals/{deal_id}/*`; readers limited to deal participants.

### 4. Seed the first admin

```sql
-- After creating the auth user via Supabase dashboard with email midoyehya2742@gmail.com:
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'midoyehya2742@gmail.com';
```

### 5. Replace the mock store

Swap `src/lib/store.ts` and `src/lib/auth.tsx` for Supabase calls. The component layer doesn't change.

| Mock function                  | Supabase replacement |
| ------------------------------ | -------------------- |
| `store.verifyLogin`            | `supabase.auth.signInWithPassword` |
| `store.listUsers`              | `select * from profiles join user_roles` |
| `store.upsertUser` (create)    | `supabase.auth.admin.createUser` (edge fn) + insert `user_roles` |
| `store.listCustomers/Products` | `select … where archived=false` |
| `store.upsertCustomer/Product` | `upsert` |
| `store.archiveCustomer/Product`| `update set archived=true` |
| `store.listDeals/getDeal`      | `select … from deals` (RLS scopes automatically) |
| `store.createDeal`             | `insert deals` + upload to Storage + insert `deal_attachments` |
| `store.updateDeal`             | `update deals` |
| `store.listAudit`              | `select * from audit_logs` (write via DB trigger on deals) |
| `store.getSettings/update`     | `select/update company_settings where id=1` |

Wrap data fetching in TanStack Query (`useQuery` / `useMutation`) and replace `useDb()` consumers — public APIs of the components stay the same.

### 6. Auth context

Replace `src/lib/auth.tsx` with one that:
- Subscribes to `supabase.auth.onAuthStateChange` early
- Hydrates `user` + `role` from `profiles` join `user_roles`
- Calls `supabase.auth.signInWithPassword` / `signOut`

---

## Scripts

```bash
bun install
bun run dev      # local dev
bun run build    # production build
```

## License

Internal use only — © UniChem.
