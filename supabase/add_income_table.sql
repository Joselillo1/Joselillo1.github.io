-- Agrega la tabla de ingresos (dividendos, intereses, etc.) a un proyecto de
-- Supabase que YA tiene las tablas `transactions` y `expenses` (ver schema.sql).
-- Pega esto en: Supabase -> SQL Editor -> New query -> Run.

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
