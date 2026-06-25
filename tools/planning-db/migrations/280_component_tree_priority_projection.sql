-- Materialize the component tree used by component-profile and component
-- ownership projections. The source governance_unit_query folds imported and
-- DB-local component authority; profile reads need the resulting tree facts,
-- not repeated tree expansion for every operator query.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-COMPONENT-TREE-PRIORITY-PROJECTION-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB component tree priority projection',
  'Architecture / Planning DB',
  'review',
  'component-profile and component ownership reads repeatedly resolve component tree facts from governance_unit_query. A DB-owned materialized projection keeps the externally visible component tree query fast while preserving the same query contract.',
  'evolutionary_architecture',
  'ListComponentProfile;ListComponentTree;RefreshComponentTreeMaterializedProjection',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

drop materialized view if exists planning_query_store.component_engineering_component_tree_projection cascade;

create materialized view planning_query_store.component_engineering_component_tree_projection as
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
where unit.level = 'component'
with data;

create unique index if not exists component_engineering_component_tree_projection_id_idx
  on planning_query_store.component_engineering_component_tree_projection (component_id);

create index if not exists component_engineering_component_tree_projection_parent_idx
  on planning_query_store.component_engineering_component_tree_projection (
    parent_component_id,
    component_id
  );

create index if not exists component_engineering_component_tree_projection_scope_idx
  on planning_query_store.component_engineering_component_tree_projection (
    root_unit,
    domain_unit,
    governance_state,
    component_id
  );

create or replace view planning_query_store.component_engineering_component_tree_query as
select
  component_id,
  name,
  component_level,
  parent_component_id,
  root_unit,
  domain_unit,
  status,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  children_required,
  direct_file_count,
  descendant_component_count,
  descendant_file_count,
  ddd_owner,
  cq_rails,
  is_materialized_component,
  has_children,
  is_leaf_component,
  raw_units
from planning_query_store.component_engineering_component_tree_projection;

create or replace view component_engineering.component_tree_query as
select
  component_id,
  name,
  component_level,
  parent_component_id,
  root_unit,
  domain_unit,
  status,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  children_required,
  direct_file_count,
  descendant_component_count,
  descendant_file_count,
  ddd_owner,
  cq_rails,
  is_materialized_component,
  has_children,
  is_leaf_component,
  raw_units
from planning_query_store.component_engineering_component_tree_projection;
