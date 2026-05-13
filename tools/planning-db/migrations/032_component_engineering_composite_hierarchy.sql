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

create or replace view planning_query_store.component_engineering_file_ownership_query as
select
  governance_file.path as file_path,
  governance_file.component_unit as leaf_component_id,
  governance_file.owning_unit,
  governance_file.root_unit,
  governance_file.domain_unit,
  governance_file.owner_level,
  governance_file.governance_state,
  governance_file.canonical_role,
  governance_file.evidence_state,
  governance_file.is_drift,
  governance_file.is_legacy,
  governance_file.ddd_owner,
  governance_file.cq_rails,
  case
    when governance_file.path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'
      then 'test'
    when governance_file.path ~* '(^|/)docs/|\.md$'
      then 'doc'
    when governance_file.path ~* '(^|/)(fixtures|vectors)/'
      then 'fixture'
    when governance_file.path ~* '(^|/)\.github/workflows/|(^|/)scripts/|(^|/)tools/'
      then 'governance-tooling'
    else 'source'
  end as file_role,
  tree.parent_component_id,
  tree.component_level,
  tree.is_leaf_component,
  governance_file.source_path,
  governance_file.source_content_sha256
from planning_query_store.governance_file_query governance_file
left join planning_query_store.component_engineering_component_tree_query tree
  on tree.component_id = governance_file.component_unit;

create or replace view planning_query_store.component_engineering_component_metadata_query as
select
  component_id,
  name as owned_concern,
  nullif(cq_rails, '') as public_api,
  case
    when nullif(cq_rails, '') is null then 'missing_public_api'
    else null
  end as public_api_gap,
  case
    when ddd_owner is null or ddd_owner = '' then 'missing_ddd_owner'
    else null
  end as ddd_owner_gap,
  jsonb_build_object(
    'source', 'component_engineering_component_tree_query',
    'semanticMetadataState', 'derived_or_missing'
  ) as metadata
from planning_query_store.component_engineering_component_tree_query;

create or replace view planning_query_store.component_engineering_drift_query as
select
  tree.component_id,
  'unresolved_parent'::text as drift_code,
  jsonb_build_object('parentComponentId', tree.parent_component_id) as metadata
from planning_query_store.component_engineering_component_tree_query tree
where tree.parent_component_id is not null
  and not exists (
    select 1
    from planning_query_store.component_engineering_component_tree_query parent
    where parent.component_id = tree.parent_component_id
  )
union all
select
  component_id,
  'children_required_without_children'::text as drift_code,
  jsonb_build_object('componentId', component_id) as metadata
from planning_query_store.component_engineering_component_tree_query
where children_required = true
  and has_children = false
union all
select
  leaf_component_id as component_id,
  'file_without_leaf_component'::text as drift_code,
  jsonb_build_object('filePath', file_path) as metadata
from planning_query_store.component_engineering_file_ownership_query
where leaf_component_id is null
   or is_leaf_component is distinct from true;
