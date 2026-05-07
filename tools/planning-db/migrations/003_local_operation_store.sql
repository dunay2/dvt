create table if not exists planning_query_store.planning_task_local_state (
  lane_id text not null,
  task_id text not null,
  source_path text not null,
  base_source_content_sha256 text not null check (base_source_content_sha256 ~ '^[a-f0-9]{64}$'),
  revision integer not null check (revision >= 0),
  status text not null check (status in ('queued', 'in_progress', 'blocked', 'review', 'done')),
  progress_pct numeric(5, 2) check (
    progress_pct is null
    or (progress_pct >= 0 and progress_pct <= 100)
  ),
  evidence_refs jsonb not null default '[]'::jsonb,
  status_reason text,
  claimed_by text,
  claim_token text,
  claim_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  raw_overlay jsonb not null default '{}'::jsonb,
  primary key (lane_id, task_id)
);

create table if not exists planning_query_store.planning_local_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null check (
    operation_type in ('task_claim', 'task_release', 'task_update')
  ),
  actor text not null,
  lane_id text not null,
  task_id text not null,
  source_path text not null,
  base_source_content_sha256 text not null check (base_source_content_sha256 ~ '^[a-f0-9]{64}$'),
  expected_revision integer check (expected_revision is null or expected_revision >= 0),
  previous_revision integer not null check (previous_revision >= 0),
  resulting_revision integer not null check (resulting_revision >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists planning_task_local_state_status_idx
  on planning_query_store.planning_task_local_state (status, lane_id, task_id);

create index if not exists planning_task_local_state_claim_idx
  on planning_query_store.planning_task_local_state (claimed_by, claim_expires_at)
  where claimed_by is not null;

create index if not exists planning_local_operations_task_idx
  on planning_query_store.planning_local_operations (lane_id, task_id, created_at);

