-- Run this in Supabase: Dashboard → SQL Editor → New query → Paste → Run

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric not null,
  description text not null default '',
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  value numeric not null,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  monthly_limit numeric not null,
  month text not null,  -- "YYYY-MM"
  created_at timestamptz not null default now(),
  unique (category, month)
);

create table if not exists gold_holdings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grams numeric not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recurring_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric not null,
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  created_at timestamptz not null default now()
);

-- Tracks which months a recurring template has been applied
create table if not exists recurring_applied (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references recurring_templates(id) on delete cascade,
  month text not null,  -- "YYYY-MM"
  transaction_id uuid references transactions(id) on delete set null,
  applied_at timestamptz not null default now(),
  unique (template_id, month)
);

create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  target_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Single-row table for caching the latest gold price
-- Source: logam-mulia-api (anekalogam / Antam)
create table if not exists gold_price_cache (
  id int primary key default 1,
  price_idr_per_gram numeric not null,
  buyback_idr_per_gram numeric not null,
  source text not null default 'anekalogam',
  recorded_date text not null,
  updated_at timestamptz not null default now()
);
