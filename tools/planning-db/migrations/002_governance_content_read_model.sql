alter table planning_query_store.governance_sources
  drop constraint if exists governance_sources_source_type_check;

alter table planning_query_store.governance_sources
  add constraint governance_sources_source_type_check check (
    source_type in (
      'governance_file_index',
      'governance_file_shard',
      'governance_component_index',
      'governance_component_file_map',
      'governance_component_shard',
      'governance_fingerprint_baseline',
      'governance_coverage_report',
      'governance_remediation_queue'
    )
  );

create table if not exists planning_query_store.governance_components (
  component_id text primary key,
  source_path text not null references planning_query_store.governance_sources(source_path) on delete cascade,
  name text not null,
  level text not null,
  parent_id text,
  root_unit text not null,
  domain_unit text not null,
  unit_path jsonb not null default '[]'::jsonb,
  status text not null,
  governance_state text not null,
  canonical_role text not null,
  evidence_state text not null,
  is_drift boolean not null,
  is_legacy boolean not null,
  children_required boolean not null,
  file_count integer not null check (file_count >= 0),
  ddd_owner text not null,
  cq_rails text not null,
  owns jsonb not null default '[]'::jsonb,
  excludes jsonb not null default '[]'::jsonb,
  governance_refs jsonb not null default '[]'::jsonb,
  fowler_signals jsonb not null default '[]'::jsonb,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_component jsonb not null
);

create table if not exists planning_query_store.governance_component_file_shards (
  component_id text primary key references planning_query_store.governance_components(component_id) on delete cascade,
  source_path text not null references planning_query_store.governance_sources(source_path) on delete cascade,
  file_count integer not null check (file_count >= 0),
  drift_file_count integer not null check (drift_file_count >= 0),
  legacy_file_count integer not null check (legacy_file_count >= 0),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_shard jsonb not null
);

create table if not exists planning_query_store.governance_component_files (
  component_id text not null references planning_query_store.governance_component_file_shards(component_id) on delete cascade,
  path text not null references planning_query_store.governance_files(path) on delete cascade,
  file_id text not null,
  owning_unit text not null,
  unit_status text not null,
  governance_state text not null,
  is_drift boolean not null,
  is_legacy boolean not null,
  source_path text not null references planning_query_store.governance_sources(source_path) on delete cascade,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_component_file jsonb not null,
  primary key (component_id, path)
);

create table if not exists planning_query_store.governance_fingerprints (
  path text primary key references planning_query_store.governance_files(path) on delete cascade,
  file_id text not null,
  source_path text not null references planning_query_store.governance_sources(source_path) on delete cascade,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  governance_hash text not null check (governance_hash ~ '^[a-f0-9]{64}$'),
  state_fingerprint text not null check (state_fingerprint ~ '^[a-f0-9]{64}$'),
  root_unit text not null,
  domain_unit text not null,
  component_unit text not null,
  owning_unit text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_fingerprint jsonb not null
);

create table if not exists planning_query_store.governance_coverage (
  coverage_id text primary key,
  source_path text not null references planning_query_store.governance_sources(source_path) on delete cascade,
  coverage_kind text not null,
  name text not null,
  count_value integer check (count_value is null or count_value >= 0),
  file_count integer check (file_count is null or file_count >= 0),
  component_id text,
  metadata jsonb not null default '{}'::jsonb,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_coverage jsonb not null
);

create table if not exists planning_query_store.governance_remediation (
  task_id text primary key,
  source_path text not null references planning_query_store.governance_sources(source_path) on delete cascade,
  task_type text not null,
  priority text not null,
  component_unit text not null,
  component_file_map text,
  root_unit text not null,
  domain_unit text not null,
  ddd_owner text not null,
  cq_rails text not null,
  blocking text not null,
  reason text not null,
  file_count integer not null check (file_count >= 0),
  document_count integer not null check (document_count >= 0),
  files jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  expected_validation jsonb not null default '[]'::jsonb,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  raw_task jsonb not null
);

create index if not exists governance_components_state_idx
  on planning_query_store.governance_components (governance_state, component_id);

create index if not exists governance_component_files_path_idx
  on planning_query_store.governance_component_files (path);

create index if not exists governance_component_files_drift_idx
  on planning_query_store.governance_component_files (is_drift, component_id)
  where is_drift = true;

create index if not exists governance_fingerprints_component_idx
  on planning_query_store.governance_fingerprints (component_unit, state_fingerprint);

create index if not exists governance_coverage_kind_name_idx
  on planning_query_store.governance_coverage (coverage_kind, name);

create index if not exists governance_coverage_component_idx
  on planning_query_store.governance_coverage (component_id)
  where component_id is not null;

create index if not exists governance_remediation_priority_type_idx
  on planning_query_store.governance_remediation (priority, task_type, component_unit);

create index if not exists governance_remediation_component_idx
  on planning_query_store.governance_remediation (component_unit);
