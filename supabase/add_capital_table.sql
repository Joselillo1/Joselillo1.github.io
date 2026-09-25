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
