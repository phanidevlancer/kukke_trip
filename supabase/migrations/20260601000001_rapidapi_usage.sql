-- Tracks RapidAPI usage per key, per calendar month (UTC).
-- One row per (nickname, month). Service-role only — never exposed to anon.

create table if not exists rapidapi_usage (
  nick text not null,
  month text not null,                       -- 'YYYY-MM' in UTC
  count int not null default 0,
  monthly_limit int not null default 100,
  updated_at timestamptz not null default now(),
  primary key (nick, month)
);

drop trigger if exists rapidapi_usage_updated_at on rapidapi_usage;
create trigger rapidapi_usage_updated_at
  before update on rapidapi_usage
  for each row execute function set_updated_at();

alter table rapidapi_usage enable row level security;
-- No anon/authenticated policy: only service_role may read/write.
