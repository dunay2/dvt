-- Code-symbol duplicates that only cross an active component with a
-- legacy/deprecated counterpart are still evidence, but they are not the same
-- as two active implementations of one behavior.

create or replace view planning_query_store.code_symbol_exact_duplicate_query as
with symbol_lifecycle as (
  select
    symbol.*,
    coalesce(definition.status, 'unknown') as component_definition_status,
    coalesce(component.status, 'unknown') as architecture_component_status,
    (
      coalesce(definition.status, '') in ('legacy', 'superseded')
      or coalesce(component.status, '') = 'deprecated'
    ) as is_legacy_or_deprecated_component
  from planning_query_store.code_symbol_inventory_query symbol
  left join planning_query_store.governance_component_definition_query definition
    on definition.component_id = symbol.component_id
  left join architecture.component component
    on component.component_id = symbol.component_id
),
duplicate_bodies as (
  select
    body_sha256,
    count(*)::int as duplicate_count,
    count(distinct file_path)::int as duplicate_file_count,
    count(distinct coalesce(component_id, 'unknown'))::int as duplicate_component_count,
    count(distinct coalesce(component_id, 'unknown'))
      filter (where not is_legacy_or_deprecated_component) as active_component_count,
    count(distinct coalesce(component_id, 'unknown'))
      filter (where is_legacy_or_deprecated_component) as legacy_or_deprecated_component_count,
    jsonb_agg(distinct file_path order by file_path) as duplicate_files,
    jsonb_agg(
      distinct coalesce(component_id, 'unknown')
      order by coalesce(component_id, 'unknown')
    ) as duplicate_components,
    jsonb_agg(
      distinct coalesce(component_id, 'unknown')
      order by coalesce(component_id, 'unknown')
    ) filter (where not is_legacy_or_deprecated_component) as active_components,
    jsonb_agg(
      distinct coalesce(component_id, 'unknown')
      order by coalesce(component_id, 'unknown')
    ) filter (where is_legacy_or_deprecated_component) as legacy_or_deprecated_components
  from symbol_lifecycle
  where normalized_body_length >= 80
  group by body_sha256
  having count(distinct file_path) > 1
)
select
  'exact_body_duplicate'::text as finding_kind,
  case
    when duplicate_bodies.active_component_count <= 1
      and duplicate_bodies.legacy_or_deprecated_component_count > 0
      then 'info'::text
    else 'warning'::text
  end as severity,
  concat('body:', symbol.body_sha256) as duplicate_key,
  symbol.symbol_id,
  symbol.symbol_name,
  symbol.symbol_kind,
  symbol.component_id,
  symbol.file_path as source_path,
  symbol.start_line,
  duplicate_bodies.duplicate_count,
  case
    when duplicate_bodies.active_component_count <= 1
      and duplicate_bodies.legacy_or_deprecated_component_count > 0
      then 'Keep the active implementation canonical and retire or wrap the legacy duplicate path.'
    else 'Extract one canonical helper or document why local duplication is intentional.'
  end as action_hint,
  jsonb_build_object(
    'bodySha256', symbol.body_sha256,
    'duplicateFileCount', duplicate_bodies.duplicate_file_count,
    'duplicateComponentCount', duplicate_bodies.duplicate_component_count,
    'activeComponentCount', duplicate_bodies.active_component_count,
    'legacyOrDeprecatedComponentCount',
      duplicate_bodies.legacy_or_deprecated_component_count,
    'duplicateFiles', duplicate_bodies.duplicate_files,
    'duplicateComponents', duplicate_bodies.duplicate_components,
    'activeComponents', coalesce(duplicate_bodies.active_components, '[]'::jsonb),
    'legacyOrDeprecatedComponents',
      coalesce(duplicate_bodies.legacy_or_deprecated_components, '[]'::jsonb),
    'duplicateDisposition',
      case
        when duplicate_bodies.active_component_count <= 1
          and duplicate_bodies.legacy_or_deprecated_component_count > 0
          then 'legacy_or_deprecated_counterpart'
        else 'active_duplicate'
      end,
    'componentDefinitionStatus', symbol.component_definition_status,
    'architectureComponentStatus', symbol.architecture_component_status,
    'normalizedBodyLength', symbol.normalized_body_length,
    'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query'
  ) as metadata
from symbol_lifecycle symbol
join duplicate_bodies
  on duplicate_bodies.body_sha256 = symbol.body_sha256;
