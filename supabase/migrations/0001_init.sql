-- ============================================================
-- Ledger — Supabase schema
-- Run in Supabase SQL editor (or `supabase db push`).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  onboarded boolean not null default false,
  currency text not null default 'INR',
  total_balance_minor bigint not null default 0 check (total_balance_minor >= 0),
  strict_savings_minor bigint not null default 0 check (strict_savings_minor >= 0),
  guilt_free_minor bigint not null default 0 check (guilt_free_minor >= 0),
  guilt_free_cycle_start date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- settings ----------
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_visibility text not null default 'always-hide'
    check (balance_visibility in ('always-hide', 'show-after-login', 'remember')),
  hide_on_load boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- transactions ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount_minor bigint not null check (amount_minor > 0),
  category text not null,
  subcategory text,
  description text not null default '',
  date date not null,
  method text not null default 'upi' check (method in ('upi', 'card', 'cash', 'netbanking')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_txn_user_date on public.transactions (user_id, date desc);
create index if not exists idx_txn_user_category on public.transactions (user_id, category);

-- ---------- budgets ----------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_minor bigint not null check (limit_minor > 0),
  month text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category, month)
);
create index if not exists idx_budget_user_month on public.budgets (user_id, month);

-- ---------- goals ----------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🎯',
  target_minor bigint not null check (target_minor > 0),
  saved_minor bigint not null default 0 check (saved_minor >= 0),
  target_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_goal_user on public.goals (user_id);

-- ---------- recurring_transactions ----------
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🔁',
  amount_minor bigint not null check (amount_minor > 0),
  category text not null,
  frequency text not null check (frequency in ('monthly', 'weekly', 'yearly')),
  next_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_recur_user_next on public.recurring_transactions (user_id, next_date);

-- ============================================================
-- Row Level Security — users can only ever touch their own rows
-- ============================================================
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.recurring_transactions enable row level security;

create policy "profiles: own row"
  on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "settings: own row"
  on public.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions: own rows"
  on public.transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets: own rows"
  on public.budgets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals: own rows"
  on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recurring: own rows"
  on public.recurring_transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile + settings when a user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
