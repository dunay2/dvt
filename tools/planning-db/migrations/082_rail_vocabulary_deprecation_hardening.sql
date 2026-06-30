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

create or replace view planning_query_store.command_query_rail_vocabulary_query as
with rail_base as (
  select
    rail.*,
    case
      when lower(coalesce(rail.rail_status, '')) in ('deprecated', 'retired') then lower(rail.rail_status)
      when rail.is_gap then 'gap'
      else 'active'
    end as vocabulary_state,
    coalesce(nullif(btrim(split_part(coalesce(rail.ddd_owner, ''), '/', 1)), ''), 'unknown') as bounded_context,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            coalesce(rail.rail_name, ''),
            '^(api|ui|cli|worker|adapter)',
            '',
            'i'
          ),
          '(command|query)$',
          '',
          'i'
        ),
        '[^a-zA-Z0-9]+',
        '',
        'g'
      )
    ) as semantic_key
  from planning_query_store.command_query_rail_query rail
),
semantic_rollup as (
  select
    rail_type,
    semantic_key,
    count(*)::int as duplicate_count,
    min(rail_name) as canonical_name,
    jsonb_agg(rail_name order by rail_name) as rail_names,
    jsonb_agg(distinct source_path order by source_path) as source_paths
  from rail_base
  where vocabulary_state = 'active'
    and semantic_key <> ''
  group by rail_type, semantic_key
),
exact_duplicates as (
  select
    'exact_duplicate'::text as finding_kind,
    'error'::text as severity,
    rail.rail_type,
    rail.rail_name,
    rail.rail_name as canonical_name,
    rail.semantic_key,
    rail.bounded_context,
    rail.ddd_owner,
    rail.rail_status,
    rail.vocabulary_state,
    rail.duplicate_count,
    'Choose one canonical rail declaration and deprecate, alias, or retire duplicate declarations.'::text as action_hint,
    rail.source_path,
    jsonb_build_object(
      'normalizedRailName', rail.normalized_rail_name,
      'relatedFeatureIds', rail.related_feature_ids,
      'relatedSourcePaths', rail.related_source_paths
    ) as metadata
  from rail_base rail
  where rail.is_duplicate
),
semantic_duplicates as (
  select
    'semantic_duplicate'::text as finding_kind,
    'error'::text as severity,
    rail.rail_type,
    rail.rail_name,
    rollup.canonical_name,
    rail.semantic_key,
    rail.bounded_context,
    rail.ddd_owner,
    rail.rail_status,
    rail.vocabulary_state,
    rollup.duplicate_count,
    'Choose one canonical rail name and deprecate aliases for the same product intent.'::text as action_hint,
    rail.source_path,
    jsonb_build_object(
      'railNames', rollup.rail_names,
      'sourcePaths', rollup.source_paths
    ) as metadata
  from rail_base rail
  join semantic_rollup rollup
    on rollup.rail_type = rail.rail_type
   and rollup.semantic_key = rail.semantic_key
  where rollup.duplicate_count > 1
),
surface_named_rails as (
  select
    'surface_named_rail'::text as finding_kind,
    'warning'::text as severity,
    rail.rail_type,
    rail.rail_name,
    rail.rail_name as canonical_name,
    rail.semantic_key,
    rail.bounded_context,
    rail.ddd_owner,
    rail.rail_status,
    rail.vocabulary_state,
    1::int as duplicate_count,
    'Rename the rail by domain/system intent; keep API/UI/CLI/worker/adapter as implementation surfaces.'::text as action_hint,
    rail.source_path,
    jsonb_build_object('surfacePrefixRule', 'api|ui|cli|worker|adapter') as metadata
  from rail_base rail
  where rail.vocabulary_state = 'active'
    and rail.rail_name ~* '^(api|ui|cli|worker|adapter)'
),
missing_owners as (
  select
    'missing_ddd_owner'::text as finding_kind,
    'error'::text as severity,
    rail.rail_type,
    rail.rail_name,
    rail.rail_name as canonical_name,
    rail.semantic_key,
    rail.bounded_context,
    rail.ddd_owner,
    rail.rail_status,
    rail.vocabulary_state,
    1::int as duplicate_count,
    'Declare the bounded context and DDD owner or read model for the rail.'::text as action_hint,
    rail.source_path,
    jsonb_build_object('railId', rail.rail_id, 'featureId', rail.feature_id) as metadata
  from rail_base rail
  where rail.vocabulary_state = 'active'
    and (
      nullif(btrim(coalesce(rail.ddd_owner, '')), '') is null
      or lower(btrim(coalesce(rail.ddd_owner, ''))) in ('-', 'none', 'unknown')
    )
),
gap_rails as (
  select
    'gap_rail'::text as finding_kind,
    'warning'::text as severity,
    rail.rail_type,
    rail.rail_name,
    rail.rail_name as canonical_name,
    rail.semantic_key,
    rail.bounded_context,
    rail.ddd_owner,
    rail.rail_status,
    rail.vocabulary_state,
    1::int as duplicate_count,
    'Implement the rail or mark it deprecated/retired with explicit rationale.'::text as action_hint,
    rail.source_path,
    jsonb_build_object(
      'implementationRefCount', rail.implementation_ref_count,
      'documentationRefCount', rail.documentation_ref_count,
      'featureId', rail.feature_id
    ) as metadata
  from rail_base rail
  where rail.vocabulary_state = 'gap'
)
select * from exact_duplicates
union all
select * from semantic_duplicates
union all
select * from surface_named_rails
union all
select * from missing_owners
union all
select * from gap_rails;
