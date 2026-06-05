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
    raw_rail,
    raw_manifest,
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
    raw_rail,
    raw_manifest,
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
  raw_rail,
  raw_manifest,
  imported_at
from effective_rails;
