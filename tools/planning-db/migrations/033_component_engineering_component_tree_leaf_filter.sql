create or replace view planning_query_store.component_engineering_component_tree_query as
select
  unit.unit_id as component_id,
  unit.name,
  unit.level as component_level,
  unit.parent_id as parent_component_id,
  unit.root_unit,
  unit.domain_unit,
  unit.status,
  unit.governance_state,
  unit.canonical_role,
  unit.evidence_state,
  unit.is_drift,
  unit.is_legacy,
  unit.children_required,
  unit.direct_file_count,
  unit.descendant_component_count,
  unit.descendant_file_count,
  unit.ddd_owner,
  unit.cq_rails,
  unit.is_materialized_component,
  exists (
    select 1
    from planning_query_store.governance_unit_query child
    where child.parent_id = unit.unit_id
      and child.level = 'component'
  ) as has_children,
  not exists (
    select 1
    from planning_query_store.governance_unit_query child
    where child.parent_id = unit.unit_id
      and child.level = 'component'
  ) as is_leaf_component,
  unit.raw_units
from planning_query_store.governance_unit_query unit
where unit.level = 'component';
