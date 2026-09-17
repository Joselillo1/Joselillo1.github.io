-- Agrega la tabla de gastos extra (cuota del banco, del broker, plataformas de
-- noticias/datos, etc.) a un proyecto de Supabase que YA tiene la tabla
-- `transactions` (ver schema.sql). Pega esto en: Supabase -> SQL Editor -> New
-- query -> Run.

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
