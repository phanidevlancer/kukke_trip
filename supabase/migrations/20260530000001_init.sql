-- Kukke Yatra — initial schema, RLS, and expense seed.
-- Anon role can read expenses + pnr_cache; all writes go through Edge Functions
-- using the service role. app_settings is never exposed to anon.

create extension if not exists pgcrypto;

-- ---------- expenses ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Travel','Stay','Temple','Food','Local','Misc')),
  amount numeric not null default 0,
  paid boolean not null default false,
  hint text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists expenses_updated_at on expenses;
create trigger expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();

-- ---------- pnr_cache ----------
create table if not exists pnr_cache (
  pnr text primary key,
  status_json jsonb not null,
  summary text,
  source text,                   -- nickname of the RapidAPI key that fetched it
  fetched_at timestamptz not null default now()
);

-- ---------- app_settings ----------
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_settings_updated_at on app_settings;
create trigger app_settings_updated_at
  before update on app_settings
  for each row execute function set_updated_at();

-- ---------- RLS ----------
alter table expenses enable row level security;
alter table pnr_cache enable row level security;
alter table app_settings enable row level security;

drop policy if exists "expenses anon select" on expenses;
create policy "expenses anon select"
  on expenses for select
  to anon, authenticated
  using (true);

drop policy if exists "pnr_cache anon select" on pnr_cache;
create policy "pnr_cache anon select"
  on pnr_cache for select
  to anon, authenticated
  using (true);

-- app_settings: deliberately no anon/authenticated policy.
-- Only service_role (which bypasses RLS) may read or write it.

-- ---------- seed expenses (only on first run) ----------
insert into expenses (name, category, amount, paid, hint, sort_order)
select * from (values
  ('Train · Kacheguda → Yesvantpur (Vande Bharat)'::text, 'Travel'::text, 3315.40::numeric, true,  null::text, 10),
  ('Train · Yesvantpur → Subrahmanya Rd (CLT Exp)',       'Travel',      1275.40,          true,  null,       20),
  ('Hotel · De Royale Montana (1 night)',                 'Stay',        0,                false, 'Enter your room tariff', 30),
  ('Train · Subrahmanya Rd → KSR Bengaluru (Panchaganga)','Travel',      1947.40,          true,  null,       40),
  ('Train · Yelhanka → Kacheguda (1A)',                   'Travel',      4855.40,          true,  null,       50),
  ('Pooja / Seva at temples',                             'Temple',      0,                false, null,       60),
  ('Cab · Pebbles Bay ↔ Kacheguda (both ways)',           'Local',       0,                false, null,       70),
  ('Taxi · Kukke ↔ Dharmasthala round trip',              'Local',       0,                false, '~₹2,500–3,000', 80),
  ('Bangalore cabs · Residency Rd & Yelhanka',            'Local',       0,                false, null,       90),
  ('Bangalore lunch · Meghana / Nagarjuna',               'Food',        0,                false, null,      100),
  ('Food & prasadam',                                     'Food',        0,                false, null,      110)
) as s(name, category, amount, paid, hint, sort_order)
where not exists (select 1 from expenses);
