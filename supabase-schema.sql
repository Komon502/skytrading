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
-- HOLDINGS TABLE
-- Snapshot of user's current assets (auto-updated via trigger)
-- ============================================================
create table if not exists public.holdings (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  mode        text check (mode in ('demo', 'real')) not null,
  symbol      text not null,
  quantity    numeric(18,6) not null default 0,
  avg_price   numeric(18,6) not null default 0,
  total_cost  numeric(18,2) not null default 0,
  updated_at  timestamptz default now() not null,
  unique(user_id, mode, symbol)
);

-- RLS
alter table public.holdings enable row level security;
drop policy if exists "Users can view own holdings" on public.holdings;
create policy "Users can view own holdings" on public.holdings for select using (auth.uid() = user_id);

-- Index
drop index if exists holdings_user_mode_idx;
create index holdings_user_mode_idx on public.holdings(user_id, mode);

-- ============================================================
-- FUNCTION: Update holdings on trade
-- Called by trigger when trade is inserted/updated
-- ============================================================
create or replace function public.update_holdings_on_trade()
returns trigger as $$
declare
  v_quantity numeric(18,6);
  v_avg_price numeric(18,6);
  v_total_cost numeric(18,2);
begin
  -- Calculate current holding for this symbol/mode
  select 
    coalesce(sum(case when type = 'buy' then quantity else -quantity end), 0),
    case when sum(case when type = 'buy' then quantity else 0 end) > 0 
      then sum(case when type = 'buy' then quantity * price else 0 end) / sum(case when type = 'buy' then quantity else 0 end)
      else 0 
    end,
    coalesce(sum(case when type = 'buy' then quantity * price else 0 end), 0)
  into v_quantity, v_avg_price, v_total_cost
  from public.trades
  where user_id = new.user_id 
    and mode = new.mode 
    and symbol = new.symbol
    and status = 'open';

  -- Insert or update holdings
  if v_quantity > 0 then
    insert into public.holdings (user_id, mode, symbol, quantity, avg_price, total_cost, updated_at)
    values (new.user_id, new.mode, new.symbol, v_quantity, v_avg_price, v_total_cost, now())
    on conflict (user_id, mode, symbol)
    do update set 
      quantity = v_quantity,
      avg_price = v_avg_price,
      total_cost = v_total_cost,
      updated_at = now();
  else
    -- Delete holding if quantity is 0
    delete from public.holdings 
    where user_id = new.user_id 
      and mode = new.mode 
      and symbol = new.symbol;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on trades insert
drop trigger if exists on_trade_inserted on public.trades;
create trigger on_trade_inserted
  after insert on public.trades
  for each row execute procedure public.update_holdings_on_trade();

-- Trigger on trades update (when status changes to closed)
drop trigger if exists on_trade_updated on public.trades;
create trigger on_trade_updated
  after update on public.trades
  for each row execute procedure public.update_holdings_on_trade();

-- Trigger on trades delete (cleanup)
drop trigger if exists on_trade_deleted on public.trades;
create trigger on_trade_deleted
  after delete on public.trades
  for each row execute procedure public.update_holdings_on_trade();

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
-- USER PROFILES TABLE
-- Extended user profile data (editable)
-- ============================================================
create table if not exists public.user_profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url  text,
  phone       text,
  bio         text,
  updated_at  timestamptz default now() not null
);

-- RLS
alter table public.user_profiles enable row level security;
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile" on public.user_profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile" on public.user_profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile" on public.user_profiles for insert with check (auth.uid() = id);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- ============================================================
-- STORAGE: avatars bucket
-- ============================================================
-- Run in Supabase Dashboard > Storage or SQL:
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- 
-- Storage policies:
-- create policy "Users can upload own avatar" on storage.objects 
--   for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users can update own avatar" on storage.objects 
--   for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Anyone can view avatars" on storage.objects 
--   for select using (bucket_id = 'avatars');

-- ============================================================
-- Done!
-- ============================================================
