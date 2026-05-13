create or replace view planning_query_store.governance_unit_query as
with component_unit_refs as (
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
    from jsonb_array_elements_text(component.unit_path) with ordinality as unit_path(value, ordinality)
    where unit_path.value = ref.value->>'id'
    order by unit_path.ordinality
    limit 1
  ) unit_position on true
  left join lateral (
    select unit_path.value as parent_id
    from jsonb_array_elements_text(component.unit_path) with ordinality as unit_path(value, ordinality)
    where unit_position.unit_order is not null
      and unit_path.ordinality = unit_position.unit_order - 1
    limit 1
  ) parent_unit on true
  where ref.value ? 'id'
),
unit_rollup as (
  select
    unit_id,
    (array_agg(distinct name order by name))[1] as name,
    (array_agg(distinct level order by level))[1] as level,
    (array_agg(distinct parent_id order by parent_id) filter (where parent_id is not null))[1] as parent_id,
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
left join planning_query_store.governance_components component
  on component.component_id = unit.unit_id;
