-- Esquema de la tabla de transacciones para Inversiones.
-- Pega esto en tu proyecto de Supabase: SQL Editor -> New query -> Run.

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ticker_symbol text not null,
  type text not null check (type in ('compra', 'venta')),
  -- Los montos se guardan como texto (igual que antes en SQLite) para no perder
  -- precisión decimal en el viaje por la red / JSON.
  quantity text not null,
  price_per_share text not null,
  fees text not null default '0',
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user on public.transactions (user_id);
create index if not exists idx_transactions_user_ticker on public.transactions (user_id, ticker_symbol);

-- Row Level Security: cada usuario solo puede ver y modificar SUS PROPIAS transacciones.
alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Gastos extra: cuota del banco, del broker, plataformas de noticias/datos, etc.
-- No están ligados a ninguna acción — no afectan el costo ni la P&L de ninguna
-- posición, es un registro aparte de "cuánto me cuesta operar".
--
-- NUEVO desde la versión que agrega gastos extra: si tu proyecto de Supabase ya
-- tiene la tabla `transactions` de arriba, NO vuelvas a correr todo este archivo
-- (las políticas de transactions fallarían por ya existir) — corré solo este
-- bloque de `expenses` en SQL Editor -> New query -> Run.
-- ============================================================================

create table if not exists public.expenses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('banco', 'broker', 'noticias', 'otro')),
  description text not null default '',
  amount text not null,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_user on public.expenses (user_id);

alter table public.expenses enable row level security;

create policy "Users can view their own expenses"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own expenses"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own expenses"
  on public.expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own expenses"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Ingresos: dividendos, intereses, etc. Dinero recibido que NO viene de vender
-- una posición — no afecta el costo de ninguna acción, pero sí suma a la
-- ganancia neta del portafolio (al revés de `expenses`, que resta).
--
-- NUEVO desde la versión que agrega ingresos: si tu proyecto de Supabase ya
-- tiene las tablas de arriba, NO vuelvas a correr todo este archivo (las
-- políticas existentes fallarían por ya existir) — corré solo este bloque de
-- `income` en SQL Editor -> New query -> Run.
-- ============================================================================

create table if not exists public.income (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('dividendo', 'interes', 'otro')),
  symbol text,
  description text not null default '',
  amount text not null,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_income_user on public.income (user_id);

alter table public.income enable row level security;

create policy "Users can view their own income"
  on public.income for select
  using (auth.uid() = user_id);

create policy "Users can insert their own income"
  on public.income for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own income"
  on public.income for update
  using (auth.uid() = user_id);

create policy "Users can delete their own income"
  on public.income for delete
  using (auth.uid() = user_id);

-- Aportes/retiros de capital (base de los % de rentabilidad).
-- Pega esto en: Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.capital_deposits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount text not null,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_capital_deposits_user on public.capital_deposits (user_id);

alter table public.capital_deposits enable row level security;

create policy "Users can view their own capital deposits"
  on public.capital_deposits for select
  using (auth.uid() = user_id);

create policy "Users can insert their own capital deposits"
  on public.capital_deposits for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own capital deposits"
  on public.capital_deposits for update
  using (auth.uid() = user_id);

create policy "Users can delete their own capital deposits"
  on public.capital_deposits for delete
  using (auth.uid() = user_id);
