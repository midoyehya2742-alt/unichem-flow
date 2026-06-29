-- Inventory Management Module for UniChem ERP.
-- Apply this after the base schema from README.md.

alter table public.products
  add column if not exists category text not null default 'General',
  add column if not exists stock_quantity numeric(14, 3) not null default 0 check (stock_quantity >= 0),
  add column if not exists minimum_stock_level numeric(14, 3) not null default 0 check (minimum_stock_level >= 0),
  add column if not exists warehouse_id uuid,
  add column if not exists batch_number text,
  add column if not exists lot_number text,
  add column if not exists expiry_date date,
  add column if not exists supplier_id uuid,
  add column if not exists average_cost numeric(14, 3),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('increase', 'decrease', 'correction', 'sale', 'override-sale')),
  quantity_before numeric(14, 3) not null check (quantity_before >= 0),
  quantity_after numeric(14, 3) not null check (quantity_after >= 0),
  quantity_changed numeric(14, 3) not null,
  reason text,
  deal_id uuid references public.deals(id) on delete set null,
  warehouse_id uuid,
  batch_number text,
  lot_number text,
  expiry_date date,
  supplier_id uuid,
  purchase_order_id uuid,
  sales_order_id uuid,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_created_idx
  on public.inventory_movements (product_id, created_at desc);

create index if not exists inventory_movements_actor_created_idx
  on public.inventory_movements (actor_id, created_at desc);

alter table public.inventory_movements enable row level security;

grant select, insert, update, delete on public.products to authenticated;
grant select, insert on public.inventory_movements to authenticated;

drop policy if exists "finance admin read inventory movements" on public.inventory_movements;
create policy "finance admin read inventory movements"
  on public.inventory_movements
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin', 'finance')
    )
  );

drop policy if exists "finance admin insert inventory movements" on public.inventory_movements;
create policy "finance admin insert inventory movements"
  on public.inventory_movements
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin', 'finance')
    )
  );

drop policy if exists "finance admin manage inventory products" on public.products;
create policy "finance admin manage inventory products"
  on public.products
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin', 'finance')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin', 'finance')
    )
  );
