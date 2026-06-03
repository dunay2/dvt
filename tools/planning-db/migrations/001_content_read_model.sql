create table if not exists planning_query_store.planning_sources (
  source_path text primary key,
  source_type text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  source_bytes bigint not null check (source_bytes >= 0),
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint planning_sources_source_type_check check (source_type in ('planning_lane'))
);

create table if not exists planning_query_store.planning_lanes (
  lane_id text primary key,
  source_path text not null references planning_query_store.planning_sources(source_path) on delete cascade,
  title text not null,
  owner text not null,
  status text not null,
  last_reviewed date,
  goal text not null default '',
  expected_outcome jsonb not null default '[]'::jsonb,
  header_markdown text not null default '',
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_lane jsonb not null
);

create table if not exists planning_query_store.planning_tasks (
  lane_id text not null references planning_query_store.planning_lanes(lane_id) on delete cascade,
  task_id text not null,
  parent_task_id text,
  priority text,
  status text not null,
  objective text not null default '',
  dependency text,
  target text,
  complexity text,
  effort_points numeric(8, 2) check (effort_points is null or effort_points >= 0),
  progress_pct numeric(5, 2) check (
    progress_pct is null
    or (progress_pct >= 0 and progress_pct <= 100)
  ),
  evidence_refs jsonb not null default '[]'::jsonb,
  status_reason text,
  last_verified date,
  source_path text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_task jsonb not null,
  primary key (lane_id, task_id)
);

create table if not exists planning_query_store.governance_sources (
  source_path text primary key,
  source_type text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  source_bytes bigint not null check (source_bytes >= 0),
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint governance_sources_source_type_check check (
    source_type in ('governance_file_index', 'governance_file_shard')
  )
);

create table if not exists planning_query_store.governance_file_shards (
  shard_id text primary key,
  source_path text not null references planning_query_store.governance_sources(source_path) on delete cascade,
  file_count integer not null check (file_count >= 0),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_shard jsonb not null
);

create table if not exists planning_query_store.governance_files (
  path text primary key,
  file_id text not null unique,
  shard_id text not null references planning_query_store.governance_file_shards(shard_id) on delete cascade,
  source_path text not null,
  path_hash text not null check (path_hash ~ '^[a-f0-9]{64}$'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  governance_hash text not null check (governance_hash ~ '^[a-f0-9]{64}$'),
  state_fingerprint text not null check (state_fingerprint ~ '^[a-f0-9]{64}$'),
  owning_unit text not null,
  root_unit text not null,
  domain_unit text not null,
  component_unit text not null,
  owner_level text not null,
  unit_status text not null,
  governance_state text not null,
  canonical_role text not null,
  evidence_state text not null,
  is_drift boolean not null,
  is_legacy boolean not null,
  ddd_owner text not null,
  cq_rails text not null,
  governance_refs jsonb not null default '[]'::jsonb,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_file jsonb not null
);

create index if not exists planning_sources_type_hash_idx
  on planning_query_store.planning_sources (source_type, content_sha256);

create index if not exists planning_tasks_status_priority_idx
  on planning_query_store.planning_tasks (status, priority, lane_id);

create index if not exists planning_tasks_parent_idx
  on planning_query_store.planning_tasks (lane_id, parent_task_id)
  where parent_task_id is not null;

create index if not exists governance_sources_type_hash_idx
  on planning_query_store.governance_sources (source_type, content_sha256);

create index if not exists governance_files_component_state_idx
  on planning_query_store.governance_files (component_unit, governance_state, path);

create index if not exists governance_files_drift_idx
  on planning_query_store.governance_files (is_drift, component_unit)
  where is_drift = true;

create index if not exists governance_files_content_hash_idx
  on planning_query_store.governance_files (content_hash);
