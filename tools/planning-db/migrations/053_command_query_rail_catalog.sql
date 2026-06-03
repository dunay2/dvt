create table if not exists planning_query_store.command_query_rails (
  rail_id text primary key,
  feature_id text not null,
  mechanization_status text not null,
  rail_name text not null,
  normalized_rail_name text not null,
  rail_type text not null,
  ddd_owner text not null,
  rail_status text not null default 'declared',
  symbol_refs jsonb not null default '[]'::jsonb,
  governing_sources jsonb not null default '[]'::jsonb,
  allowed_implementation_surfaces jsonb not null default '[]'::jsonb,
  architecture_guards jsonb not null default '[]'::jsonb,
  completion_gate jsonb not null default '[]'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  raw_rail jsonb not null,
  raw_manifest jsonb not null,
  imported_at timestamptz not null default now()
);

alter table planning_query_store.command_query_rails
  drop constraint if exists command_query_rails_rail_type_check;

alter table planning_query_store.command_query_rails
  add constraint command_query_rails_rail_type_check
  check (rail_type in ('command', 'query'));

create index if not exists command_query_rails_type_name_idx
  on planning_query_store.command_query_rails (rail_type, normalized_rail_name);

create index if not exists command_query_rails_status_idx
  on planning_query_store.command_query_rails (rail_status);

create index if not exists command_query_rails_owner_idx
  on planning_query_store.command_query_rails (ddd_owner);

create index if not exists command_query_rails_source_idx
  on planning_query_store.command_query_rails (source_path);

create or replace view planning_query_store.command_query_rail_query as
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
  jsonb_array_length(symbol_refs) as implementation_ref_count,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  (
    rail_status ~* '^(missing|planned|unimplemented|not-implemented)'
    or jsonb_array_length(symbol_refs) = 0
  ) as is_gap,
  count(*) over (partition by rail_type, normalized_rail_name) as duplicate_count,
  count(*) over (partition by rail_type, normalized_rail_name) > 1 as is_duplicate,
  source_path,
  source_content_sha256,
  imported_at
from planning_query_store.command_query_rails;
