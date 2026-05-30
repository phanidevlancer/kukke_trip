-- Attachments: PDFs / images attached to expenses, train PNRs, or the hotel
-- booking. Files live in the private `attachments` Storage bucket; this table
-- holds the metadata + path. Anon reads are blocked — the `attachments` Edge
-- Function mints short-lived signed URLs on demand.

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('expense','train','hotel')),
  target_id text not null,             -- expense uuid, PNR string, or hotel booking ref
  storage_path text not null,          -- key inside the `attachments` bucket
  filename text not null,
  content_type text not null,
  size_bytes int not null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_target_idx
  on attachments (target_type, target_id, created_at desc);

alter table attachments enable row level security;

-- No anon/authenticated policies. All access is via the Edge Function using
-- the service-role client, which bypasses RLS.

-- Create the private Storage bucket idempotently.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage RLS: no anon access. Service-role bypasses RLS — the Edge Function
-- does all reads/writes through that path.
