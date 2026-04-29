-- ============================================================
-- SkyTrading - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- WALLETS TABLE
-- Stores demo and real balance separately per user
-- ============================================================
create table if not exists public.wallets (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  demo_balance numeric(15,2) not null default 5000.00,
  real_balance numeric(15,2) not null default 0.00,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- RLS: users can only see/edit their own wallet
alter table public.wallets enable row level security;
drop policy if exists "Users can view own wallet" on public.wallets;
create policy "Users can view own wallet" on public.wallets for select using (auth.uid() = user_id);
drop policy if exists "Users can update own wallet" on public.wallets;
create policy "Users can update own wallet" on public.wallets for update using (auth.uid() = user_id);
drop policy if exists "Users can insert own wallet" on public.wallets;
create policy "Users can insert own wallet" on public.wallets for insert with check (auth.uid() = user_id);

-- ============================================================
-- TRADES TABLE
-- All buy/sell orders (both demo and real)
-- ============================================================
create table if not exists public.trades (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  mode        text check (mode in ('demo', 'real')) not null,
  symbol      text not null,
  type        text check (type in ('buy', 'sell')) not null,
  quantity    numeric(18,6) not null,
  price       numeric(18,6) not null,
  total       numeric(18,2) not null,
  status      text check (status in ('open', 'closed')) not null default 'open',
  created_at  timestamptz default now() not null,
  closed_at   timestamptz,
  close_price numeric(18,6),
  pnl         numeric(15,2)
);

-- RLS
alter table public.trades enable row level security;
drop policy if exists "Users can view own trades" on public.trades;
create policy "Users can view own trades" on public.trades for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own trades" on public.trades;
create policy "Users can insert own trades" on public.trades for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own trades" on public.trades;
create policy "Users can update own trades" on public.trades for update using (auth.uid() = user_id);

-- Index for performance
drop index if exists trades_user_id_idx;
create index trades_user_id_idx on public.trades(user_id);
drop index if exists trades_status_idx;
create index trades_status_idx on public.trades(status);
drop index if exists trades_mode_idx;
create index trades_mode_idx on public.trades(mode);

-- ============================================================
-- DEPOSITS TABLE
-- Tracks all deposit transactions via SlipOk
-- ============================================================
create table if not exists public.deposits (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  amount      numeric(15,2) not null,
  slip_url    text,
  slipok_ref  text unique,  -- prevent duplicate slips
  status      text check (status in ('pending', 'verified', 'rejected')) not null default 'pending',
  created_at  timestamptz default now() not null
);

-- RLS
alter table public.deposits enable row level security;
drop policy if exists "Users can view own deposits" on public.deposits;
create policy "Users can view own deposits" on public.deposits for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own deposits" on public.deposits;
create policy "Users can insert own deposits" on public.deposits for insert with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE: slips bucket
-- For storing uploaded slip images
-- ============================================================
-- Run this separately in Supabase Dashboard > Storage
-- Or via API:
-- insert into storage.buckets (id, name, public) values ('slips', 'slips', false);
-- 
-- Storage policy (allow authenticated users to upload):
-- create policy "Users can upload own slips" on storage.objects 
--   for insert with check (bucket_id = 'slips' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users can view own slips" on storage.objects 
--   for select using (bucket_id = 'slips' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- TRIGGER: auto-create wallet on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.wallets (user_id, demo_balance, real_balance)
  values (new.id, 5000.00, 0.00);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Done!
-- ============================================================
