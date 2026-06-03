create or replace view planning_query_store.governance_component_local_metadata_query as
with local_ownership as (
  select
    pattern.component_id,
    coalesce(
      jsonb_agg(pattern.pattern order by pattern.pattern_order, pattern.pattern)
        filter (where pattern.pattern_kind = 'owns'),
      '[]'::jsonb
    ) as owns,
    coalesce(
      jsonb_agg(pattern.pattern order by pattern.pattern_order, pattern.pattern)
        filter (where pattern.pattern_kind = 'excludes'),
      '[]'::jsonb
    ) as excludes
  from planning_query_store.governance_component_local_ownership_patterns pattern
  group by pattern.component_id
),
local_semantic_items as (
  select
    item.component_id,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'responsibility'),
      '[]'::jsonb
    ) as responsibilities,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'non_goal'),
      '[]'::jsonb
    ) as non_goals,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'reason_to_change'),
      '[]'::jsonb
    ) as reasons_to_change,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'public_api'),
      '[]'::jsonb
    ) as public_api,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'invariant'),
      '[]'::jsonb
    ) as invariants,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'transition'),
      '[]'::jsonb
    ) as transitions,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'consumer'),
      '[]'::jsonb
    ) as consumers,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'governance_ref'),
      '[]'::jsonb
    ) as governance_refs,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'fowler_signal'),
      '[]'::jsonb
    ) as fowler_signals
  from planning_query_store.governance_component_local_semantic_items item
  group by item.component_id
),
local_fields as (
  select
    definition.component_id,
    definition.source_path,
    definition.source_content_sha256,
    definition.revision,
    definition.name,
    definition.level,
    definition.parent_id,
    definition.root_unit,
    definition.domain_unit,
    definition.status,
    definition.children_required,
    0::integer as file_count,
    coalesce(local_ownership.owns, '[]'::jsonb) as owns,
    coalesce(local_ownership.excludes, '[]'::jsonb) as excludes,
    definition.owned_concern,
    coalesce(local_semantic_items.responsibilities, '[]'::jsonb) as responsibilities,
    coalesce(local_semantic_items.non_goals, '[]'::jsonb) as non_goals,
    coalesce(local_semantic_items.reasons_to_change, '[]'::jsonb) as reasons_to_change,
    definition.ddd_owner,
    definition.cq_rails,
    coalesce(local_semantic_items.public_api, '[]'::jsonb) as public_api,
    coalesce(local_semantic_items.invariants, '[]'::jsonb) as invariants,
    coalesce(local_semantic_items.transitions, '[]'::jsonb) as transitions,
    coalesce(local_semantic_items.consumers, '[]'::jsonb) as consumers,
    coalesce(local_semantic_items.governance_refs, '[]'::jsonb) as governance_refs,
    coalesce(local_semantic_items.fowler_signals, '[]'::jsonb) as fowler_signals,
    definition.created_by,
    definition.created_at
  from planning_query_store.governance_component_local_definitions definition
  left join local_ownership
    on local_ownership.component_id = definition.component_id
  left join local_semantic_items
    on local_semantic_items.component_id = definition.component_id
)
select
  fields.component_id,
  fields.source_path,
  fields.source_content_sha256,
  fields.revision,
  fields.name,
  fields.level,
  fields.parent_id,
  fields.root_unit,
  fields.domain_unit,
  fields.status,
  fields.children_required,
  fields.file_count,
  fields.owns,
  fields.excludes,
  fields.owned_concern,
  fields.responsibilities,
  fields.non_goals,
  fields.reasons_to_change,
  fields.ddd_owner,
  fields.cq_rails,
  fields.public_api,
  fields.invariants,
  fields.transitions,
  fields.consumers,
  fields.governance_refs,
  fields.fowler_signals,
  fields.created_by,
  fields.created_at,
  jsonb_build_object(
    'id', fields.component_id,
    'name', fields.name,
    'level', fields.level,
    'parent', fields.parent_id,
    'status', fields.status,
    'childrenRequired', fields.children_required,
    'dddOwner', fields.ddd_owner,
    'cqRails', fields.cq_rails,
    'ownedConcern', fields.owned_concern,
    'owns', fields.owns,
    'excludes', fields.excludes,
    'responsibilities', fields.responsibilities,
    'nonGoals', fields.non_goals,
    'reasonsToChange', fields.reasons_to_change,
    'publicApi', fields.public_api,
    'invariants', fields.invariants,
    'transitions', fields.transitions,
    'consumers', fields.consumers,
    'governance', fields.governance_refs,
    'fowlerSignals', fields.fowler_signals
  ) as raw_unit
from local_fields fields;

create or replace view planning_query_store.governance_component_definition_query as
with imported_components as (
  select
    component.component_id,
    'imported'::text as definition_source,
    component.source_path,
    component.source_content_sha256,
    0::integer as revision,
    component.name,
    component.level,
    component.parent_id,
    component.root_unit,
    component.domain_unit,
    component.status,
    component.children_required,
    component.file_count,
    component.owns,
    component.excludes,
    nullif(component.raw_component->>'ownedConcern', '') as owned_concern,
    coalesce(component.raw_component->'responsibilities', '[]'::jsonb) as responsibilities,
    coalesce(component.raw_component->'nonGoals', '[]'::jsonb) as non_goals,
    coalesce(component.raw_component->'reasonsToChange', '[]'::jsonb) as reasons_to_change,
    component.ddd_owner,
    component.cq_rails,
    coalesce(component.raw_component->'publicApi', '[]'::jsonb) as public_api,
    coalesce(component.raw_component->'invariants', '[]'::jsonb) as invariants,
    coalesce(component.raw_component->'transitions', '[]'::jsonb) as transitions,
    coalesce(component.raw_component->'consumers', '[]'::jsonb) as consumers,
    component.governance_refs,
    component.fowler_signals,
    null::text as created_by,
    null::timestamptz as created_at,
    coalesce(
      (
        select unit_ref.value
        from jsonb_array_elements(coalesce(component.raw_component->'unitReferences', '[]'::jsonb))
          as unit_ref(value)
        where unit_ref.value->>'id' = component.component_id
        limit 1
      ),
      component.raw_component
    ) as raw_unit
  from planning_query_store.governance_components component
),
local_components as (
  select
    local_metadata.component_id,
    'local_command'::text as definition_source,
    local_metadata.source_path,
    local_metadata.source_content_sha256,
    local_metadata.revision,
    local_metadata.name,
    local_metadata.level,
    local_metadata.parent_id,
    local_metadata.root_unit,
    local_metadata.domain_unit,
    local_metadata.status,
    local_metadata.children_required,
    local_metadata.file_count,
    local_metadata.owns,
    local_metadata.excludes,
    local_metadata.owned_concern,
    local_metadata.responsibilities,
    local_metadata.non_goals,
    local_metadata.reasons_to_change,
    local_metadata.ddd_owner,
    local_metadata.cq_rails,
    local_metadata.public_api,
    local_metadata.invariants,
    local_metadata.transitions,
    local_metadata.consumers,
    local_metadata.governance_refs,
    local_metadata.fowler_signals,
    local_metadata.created_by,
    local_metadata.created_at,
    local_metadata.raw_unit
  from planning_query_store.governance_component_local_metadata_query local_metadata
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_metadata.component_id
  )
)
select *
from imported_components
union all
select *
from local_components;

create or replace view component_engineering.component_definition_query as
select *
from planning_query_store.governance_component_definition_query;

create or replace view planning_query_store.governance_unit_query as
with recursive base_component_unit_refs as (
  select
    component.component_id as descendant_component_id,
    component.file_count as descendant_file_count,
    component.root_unit,
    component.domain_unit,
    component.source_path,
    component.source_content_sha256,
    ref.value as raw_unit,
    ref.value->>'id' as unit_id,
    ref.value->>'name' as name,
    ref.value->>'level' as level,
    ref.value->>'status' as status,
    unit_position.unit_order,
    parent_unit.parent_id
  from planning_query_store.governance_components component
  cross join lateral jsonb_array_elements(
    coalesce(component.raw_component->'unitReferences', '[]'::jsonb)
  ) as ref(value)
  left join lateral (
    select unit_path.ordinality::int as unit_order
    from jsonb_array_elements_text(component.unit_path) with ordinality
      as unit_path(value, ordinality)
    where unit_path.value = ref.value->>'id'
    order by unit_path.ordinality
    limit 1
  ) unit_position on true
  left join lateral (
    select unit_path.value as parent_id
    from jsonb_array_elements_text(component.unit_path) with ordinality
      as unit_path(value, ordinality)
    where unit_position.unit_order is not null
      and unit_path.ordinality = unit_position.unit_order - 1
    limit 1
  ) parent_unit on true
  where ref.value ? 'id'
),
base_unit_rollup as (
  select
    unit_id,
    (array_agg(distinct name order by name))[1] as name,
    (array_agg(distinct level order by level))[1] as level,
    (array_agg(distinct parent_id order by parent_id) filter (where parent_id is not null))[1]
      as parent_id,
    (array_agg(distinct root_unit order by root_unit))[1] as root_unit,
    (array_agg(distinct domain_unit order by domain_unit))[1] as domain_unit,
    (array_agg(distinct status order by status))[1] as status,
    coalesce(jsonb_agg(distinct raw_unit), '[]'::jsonb) as raw_units
  from base_component_unit_refs
  group by unit_id
),
local_units as (
  select
    local_metadata.component_id as unit_id,
    local_metadata.name,
    local_metadata.level,
    local_metadata.parent_id,
    local_metadata.root_unit,
    local_metadata.domain_unit,
    local_metadata.status,
    local_metadata.source_path,
    local_metadata.source_content_sha256,
    local_metadata.raw_unit
  from planning_query_store.governance_component_local_metadata_query local_metadata
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_metadata.component_id
  )
),
parent_lookup as (
  select
    unit_id,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    raw_units->0 as raw_unit
  from base_unit_rollup
  union all
  select
    unit_id,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    raw_unit
  from local_units
),
local_component_unit_refs(
  descendant_component_id,
  descendant_file_count,
  root_unit,
  domain_unit,
  source_path,
  source_content_sha256,
  raw_unit,
  unit_id,
  name,
  level,
  status,
  unit_order,
  parent_id,
  visited
) as (
  select
    local_unit.unit_id as descendant_component_id,
    0::integer as descendant_file_count,
    local_unit.root_unit,
    local_unit.domain_unit,
    local_unit.source_path,
    local_unit.source_content_sha256,
    local_unit.raw_unit,
    local_unit.unit_id,
    local_unit.name,
    local_unit.level,
    local_unit.status,
    1000000::integer as unit_order,
    local_unit.parent_id,
    array[local_unit.unit_id]::text[] as visited
  from local_units local_unit
  union all
  select
    child.descendant_component_id,
    0::integer as descendant_file_count,
    child.root_unit,
    child.domain_unit,
    child.source_path,
    child.source_content_sha256,
    parent.raw_unit,
    parent.unit_id,
    parent.name,
    parent.level,
    parent.status,
    child.unit_order - 1,
    parent.parent_id,
    child.visited || parent.unit_id
  from local_component_unit_refs child
  join parent_lookup parent
    on parent.unit_id = child.parent_id
  where not parent.unit_id = any(child.visited)
),
component_unit_refs as (
  select
    descendant_component_id,
    descendant_file_count,
    root_unit,
    domain_unit,
    source_path,
    source_content_sha256,
    raw_unit,
    unit_id,
    name,
    level,
    status,
    unit_order,
    parent_id
  from base_component_unit_refs
  union all
  select
    descendant_component_id,
    descendant_file_count,
    root_unit,
    domain_unit,
    source_path,
    source_content_sha256,
    raw_unit,
    unit_id,
    name,
    level,
    status,
    unit_order,
    parent_id
  from local_component_unit_refs
),
unit_rollup as (
  select
    unit_id,
    (array_agg(distinct name order by name))[1] as name,
    (array_agg(distinct level order by level))[1] as level,
    (array_agg(distinct parent_id order by parent_id) filter (where parent_id is not null))[1]
      as parent_id,
    (array_agg(distinct root_unit order by root_unit))[1] as root_unit,
    (array_agg(distinct domain_unit order by domain_unit))[1] as domain_unit,
    (array_agg(distinct status order by status))[1] as status,
    count(distinct descendant_component_id)::int as descendant_component_count,
    coalesce(sum(descendant_file_count), 0)::int as descendant_file_count,
    coalesce(jsonb_agg(distinct source_path order by source_path), '[]'::jsonb) as source_paths,
    coalesce(jsonb_agg(distinct source_content_sha256 order by source_content_sha256), '[]'::jsonb)
      as source_content_sha256_values,
    coalesce(jsonb_agg(distinct raw_unit), '[]'::jsonb) as raw_units
  from component_unit_refs
  group by unit_id
),
direct_components as (
  select
    component.component_id,
    component.status,
    component.governance_state,
    component.canonical_role,
    component.evidence_state,
    component.is_drift,
    component.is_legacy,
    component.children_required,
    component.file_count,
    component.ddd_owner,
    component.cq_rails,
    component.source_path,
    component.source_content_sha256
  from planning_query_store.governance_components component
  union all
  select
    local_metadata.component_id,
    local_metadata.status,
    case
      when local_metadata.status = 'canonical' then 'governed'
      else local_metadata.status
    end as governance_state,
    case
      when local_metadata.status = 'canonical' then 'implementation-owner'
      else 'none'
    end as canonical_role,
    case
      when local_metadata.status = 'canonical' then 'classification-only'
      when local_metadata.status = 'coverage-required' then 'coverage-required'
      when local_metadata.status in ('drift', 'legacy') then 'remediation-required'
      when local_metadata.status = 'review' then 'review-required'
      when local_metadata.status = 'superseded' then 'retired'
      else 'remediation-required'
    end as evidence_state,
    local_metadata.status = 'drift' as is_drift,
    local_metadata.status = 'legacy' as is_legacy,
    local_metadata.children_required,
    local_metadata.file_count,
    local_metadata.ddd_owner,
    local_metadata.cq_rails,
    local_metadata.source_path,
    local_metadata.source_content_sha256
  from planning_query_store.governance_component_local_metadata_query local_metadata
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_metadata.component_id
  )
)
select
  unit.unit_id,
  unit.name,
  unit.level,
  unit.parent_id,
  unit.root_unit,
  unit.domain_unit,
  coalesce(component.status, unit.status) as status,
  coalesce(component.governance_state, unit.status) as governance_state,
  coalesce(component.canonical_role, 'none') as canonical_role,
  coalesce(
    component.evidence_state,
    case
      when unit.status = 'review' then 'review-required'
      else unit.status
    end
  ) as evidence_state,
  coalesce(component.is_drift, false) as is_drift,
  coalesce(component.is_legacy, false) as is_legacy,
  coalesce(component.children_required, false) as children_required,
  coalesce(component.file_count, 0)::int as direct_file_count,
  unit.descendant_component_count,
  unit.descendant_file_count,
  component.ddd_owner,
  component.cq_rails,
  component.component_id is not null as is_materialized_component,
  component.source_path as direct_source_path,
  component.source_content_sha256 as direct_source_content_sha256,
  unit.source_paths,
  unit.source_content_sha256_values,
  unit.raw_units
from unit_rollup unit
left join direct_components component
  on component.component_id = unit.unit_id;

alter table planning_query_store.governance_component_local_definitions
  drop column if exists owns,
  drop column if exists excludes,
  drop column if exists responsibilities,
  drop column if exists non_goals,
  drop column if exists reasons_to_change,
  drop column if exists public_api,
  drop column if exists invariants,
  drop column if exists transitions,
  drop column if exists consumers,
  drop column if exists governance_refs,
  drop column if exists fowler_signals,
  drop column if exists raw_unit;
