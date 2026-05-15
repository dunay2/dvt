create table if not exists architecture.design_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null check (operation_type in ('architecture_design_create')),
  actor text not null,
  design_id text not null references architecture.design(design_id) on delete restrict,
  source_ref text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  expected_revision integer check (expected_revision is null or expected_revision >= 0),
  previous_revision integer not null check (previous_revision >= 0),
  resulting_revision integer not null check (resulting_revision >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists architecture_design_operations_design_idx
  on architecture.design_operations(design_id, created_at);

create index if not exists architecture_design_operations_source_idx
  on architecture.design_operations(source_ref, source_content_sha256);
