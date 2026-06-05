create table if not exists planning_query_store.feature_mechanization_local_rails (
  rail_id text primary key,
  feature_id text not null,
  mechanization_status text not null,
  rail_name text not null,
  normalized_rail_name text not null,
  rail_type text not null,
  ddd_owner text not null,
  rail_status text not null default 'declared',
  symbol_refs jsonb not null default '[]'::jsonb,
  implementation_refs jsonb not null default '[]'::jsonb,
  documentation_refs jsonb not null default '[]'::jsonb,
  governing_sources jsonb not null default '[]'::jsonb,
  allowed_implementation_surfaces jsonb not null default '[]'::jsonb,
  architecture_guards jsonb not null default '[]'::jsonb,
  completion_gate jsonb not null default '[]'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  raw_rail jsonb not null,
  raw_manifest jsonb not null,
  revision integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_mechanization_local_rails_type_check
    check (rail_type in ('command', 'query')),
  constraint feature_mechanization_local_rails_mechanization_status_check
    check (mechanization_status in ('closed', 'implemented'))
);

create index if not exists feature_mechanization_local_rails_type_name_idx
  on planning_query_store.feature_mechanization_local_rails (rail_type, normalized_rail_name);

create index if not exists feature_mechanization_local_rails_feature_idx
  on planning_query_store.feature_mechanization_local_rails (feature_id);

create table if not exists planning_query_store.feature_mechanization_local_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null,
  actor text not null,
  rail_id text not null,
  source_path text not null,
  source_content_sha256 text not null,
  expected_revision integer,
  previous_revision integer,
  resulting_revision integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists feature_mechanization_local_operations_rail_idx
  on planning_query_store.feature_mechanization_local_operations (rail_id, created_at desc);

drop view if exists planning_query_store.command_query_rail_query;

create or replace view planning_query_store.command_query_rail_query as
with imported_rails as (
  select
    rail_id,
    feature_id,
    mechanization_status,
    rail_name,
    normalized_rail_name,
    rail_type,
    ddd_owner,
    rail_status,
    symbol_refs,
    implementation_refs,
    documentation_refs,
    governing_sources,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    source_path,
    source_content_sha256,
    imported_at
  from planning_query_store.command_query_rails
),
local_rails as (
  select
    rail_id,
    feature_id,
    mechanization_status,
    rail_name,
    normalized_rail_name,
    rail_type,
    ddd_owner,
    rail_status,
    symbol_refs,
    implementation_refs,
    documentation_refs,
    governing_sources,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    source_path,
    source_content_sha256,
    updated_at as imported_at
  from planning_query_store.feature_mechanization_local_rails
),
effective_rails as (
  select * from imported_rails
  union all
  select * from local_rails
)
select
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  jsonb_array_length(implementation_refs) as implementation_ref_count,
  jsonb_array_length(documentation_refs) as documentation_ref_count,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  (
    rail_status ~* '^(missing|planned|unimplemented|not-implemented)'
    or jsonb_array_length(implementation_refs) = 0
  ) as is_gap,
  count(*) over (partition by rail_type, normalized_rail_name) as duplicate_count,
  count(*) over (partition by rail_type, normalized_rail_name) > 1 as is_duplicate,
  source_path,
  source_content_sha256,
  imported_at
from effective_rails;
