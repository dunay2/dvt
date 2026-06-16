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
    count(*) filter (
      where authority_priority <= 2
        and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
    )::int as canonical_candidate_count,
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
        case when lower(coalesce(rail.rail_status, '')) in ('deprecated', 'retired') then 1 else 0 end,
        case when rail.rail_source = 'local' then 0 else 1 end,
        rail.is_gap,
        rail.authority_priority,
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
