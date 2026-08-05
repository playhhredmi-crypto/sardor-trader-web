-- Sardor Trader — Supabase sxemasi
-- Buni Supabase loyihangizdagi "SQL Editor" bo'limiga joylab, "Run" bosing

-- 1. Signallar jadvali
create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text default 'XAUUSD',
  timeframes text,               -- masalan "M2, M5, H1"
  direction text not null,       -- BUY / SELL / WAIT
  entry text,
  stop_loss text,
  take_profit text,
  risk_reward text,
  confidence int,
  reasoning text,
  outcome text default 'pending', -- pending / win / loss
  created_at timestamptz default now()
);

alter table signals enable row level security;

create policy "Users can view own signals"
  on signals for select
  using (auth.uid() = user_id);

create policy "Users can insert own signals"
  on signals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own signals"
  on signals for update
  using (auth.uid() = user_id);
