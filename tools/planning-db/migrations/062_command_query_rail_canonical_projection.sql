drop view if exists planning_query_store.command_query_rail_query;
drop view if exists planning_query_store.command_query_rail_manifest_query;

create or replace view planning_query_store.command_query_rail_manifest_query as
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
    imported_at,
    'imported'::text as rail_source,
    1 as source_priority
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
    updated_at as imported_at,
    'local'::text as rail_source,
    0 as source_priority
  from planning_query_store.feature_mechanization_local_rails
),
ranked_rails as (
  select
    combined_rails.*,
    row_number() over (
      partition by feature_id, rail_type, normalized_rail_name
      order by source_priority, imported_at desc, rail_id
    ) as source_rank
  from (
    select * from imported_rails
    union all
    select * from local_rails
  ) combined_rails
),
effective_manifest_rails as (
  select *
  from ranked_rails
  where source_rank = 1
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
  count(*) over (partition by rail_type, normalized_rail_name) as reference_count,
  count(*) over (partition by rail_type, normalized_rail_name) as duplicate_count,
  count(*) over (partition by rail_type, normalized_rail_name) > 1 as is_duplicate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  rail_source,
  imported_at
from effective_manifest_rails;

create or replace view planning_query_store.command_query_rail_query as
with manifest_rails as (
  select
    rail.*,
    case
      when rail.rail_source = 'local' then 0
      when rail.feature_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG' then 1
      when rail.source_path like 'docs/architecture/components/%command-query-catalog.md' then 1
      when rail.source_path like 'docs/architecture/components/%' then 2
      when rail.mechanization_status in ('implemented', 'closed') then 3
      else 4
    end as authority_priority
  from planning_query_store.command_query_rail_manifest_query rail
),
reference_rollup as (
  select
    rail_type,
    normalized_rail_name,
    count(*)::int as reference_count,
    count(*) filter (where authority_priority <= 1)::int as canonical_candidate_count,
    jsonb_agg(distinct feature_id order by feature_id) as related_feature_ids,
    jsonb_agg(distinct source_path order by source_path) as related_source_paths
  from manifest_rails
  group by rail_type, normalized_rail_name
),
ranked_canonical_rails as (
  select
    rail.*,
    row_number() over (
      partition by rail.rail_type, rail.normalized_rail_name
      order by
        rail.authority_priority,
        rail.is_gap,
        rail.implementation_ref_count desc,
        rail.documentation_ref_count desc,
        rail.imported_at desc,
        rail.rail_id
    ) as canonical_rank
  from manifest_rails rail
)
select
  rail.rail_id,
  rail.feature_id,
  rail.mechanization_status,
  rail.rail_name,
  rail.normalized_rail_name,
  rail.rail_type,
  rail.ddd_owner,
  rail.rail_status,
  rail.symbol_refs,
  rail.implementation_refs,
  rail.documentation_refs,
  rail.implementation_ref_count,
  rail.documentation_ref_count,
  rail.governing_sources,
  rail.allowed_implementation_surfaces,
  rail.architecture_guards,
  rail.completion_gate,
  rail.is_gap,
  rollup.reference_count,
  rollup.canonical_candidate_count as duplicate_count,
  rollup.canonical_candidate_count > 1 as is_duplicate,
  rollup.related_feature_ids,
  rollup.related_source_paths,
  rail.source_path,
  rail.source_content_sha256,
  rail.raw_rail,
  rail.raw_manifest,
  rail.rail_source,
  rail.imported_at
from ranked_canonical_rails rail
join reference_rollup rollup
  on rollup.rail_type = rail.rail_type
 and rollup.normalized_rail_name = rail.normalized_rail_name
where rail.canonical_rank = 1;
