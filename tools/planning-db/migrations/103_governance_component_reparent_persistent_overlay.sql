create table if not exists planning_query_store.governance_component_reparent_overrides (
  component_id text primary key,
  parent_id text not null,
  root_unit text not null,
  domain_unit text not null,
  unit_path jsonb not null check (jsonb_typeof(unit_path) = 'array'),
  raw_component jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  revision integer not null check (revision >= 0),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create index if not exists governance_component_reparent_overrides_parent_idx
  on planning_query_store.governance_component_reparent_overrides(parent_id, component_id);

with recursive latest_reparent as (
  select distinct on (operation.component_id)
    operation.component_id,
    operation.payload->>'parentComponentId' as parent_id,
    operation.source_path,
    operation.source_content_sha256,
    operation.resulting_revision,
    operation.actor,
    operation.created_at
  from planning_query_store.governance_component_local_operations operation
  where operation.operation_type = 'component_reparent'
    and nullif(operation.payload->>'parentComponentId', '') is not null
  order by operation.component_id, operation.resulting_revision desc, operation.created_at desc
),
parent_chain(component_id, unit_id, parent_id, depth) as (
  select
    latest.component_id,
    parent.unit_id,
    parent.parent_id,
    0::integer as depth
  from latest_reparent latest
  join planning_query_store.governance_unit_query parent
    on parent.unit_id = latest.parent_id
  union all
  select
    chain.component_id,
    parent.unit_id,
    parent.parent_id,
    chain.depth + 1
  from parent_chain chain
  join planning_query_store.governance_unit_query parent
    on parent.unit_id = chain.parent_id
  where chain.depth < 64
),
parent_path as (
  select
    component_id,
    jsonb_agg(unit_id order by depth desc) as parent_unit_path
  from parent_chain
  group by component_id
),
backfill as (
  select
    latest.component_id,
    latest.parent_id,
    coalesce(parent.root_unit, parent.unit_id) as root_unit,
    coalesce(parent.domain_unit, parent.root_unit, parent.unit_id) as domain_unit,
    parent_path.parent_unit_path || jsonb_build_array(latest.component_id) as unit_path,
    latest.source_path,
    latest.source_content_sha256,
    latest.resulting_revision,
    latest.actor,
    latest.created_at,
    component.raw_component
  from latest_reparent latest
  join planning_query_store.governance_components component
    on component.component_id = latest.component_id
  join planning_query_store.governance_unit_query parent
    on parent.unit_id = latest.parent_id
  join parent_path
    on parent_path.component_id = latest.component_id
)
insert into planning_query_store.governance_component_reparent_overrides
  (component_id, parent_id, root_unit, domain_unit, unit_path, raw_component,
   source_path, source_content_sha256, revision, updated_by, updated_at)
select
  backfill.component_id,
  backfill.parent_id,
  backfill.root_unit,
  backfill.domain_unit,
  backfill.unit_path,
  jsonb_set(
    jsonb_set(
      coalesce(backfill.raw_component, '{}'::jsonb),
      '{parent}',
      to_jsonb(backfill.parent_id),
      true
    ),
    '{unitPath}',
    backfill.unit_path,
    true
  ) as raw_component,
  backfill.source_path,
  backfill.source_content_sha256,
  backfill.resulting_revision,
  backfill.actor,
  backfill.created_at
from backfill
on conflict (component_id) do update set
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  unit_path = excluded.unit_path,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = excluded.revision,
  updated_by = excluded.updated_by,
  updated_at = excluded.updated_at;

create or replace view planning_query_store.governance_component_reparent_override_query as
select
  component_id,
  parent_id,
  root_unit,
  domain_unit,
  unit_path,
  raw_component,
  source_path,
  source_content_sha256,
  revision,
  updated_by,
  updated_at
from planning_query_store.governance_component_reparent_overrides;

create or replace view component_engineering.component_tree_query as
with recursive effective_tree as (
  select
    tree.component_id,
    tree.name,
    tree.component_level,
    coalesce(reparent.parent_id, tree.parent_component_id) as parent_component_id,
    coalesce(reparent.root_unit, tree.root_unit) as root_unit,
    coalesce(reparent.domain_unit, tree.domain_unit) as domain_unit,
    tree.status,
    tree.governance_state,
    tree.canonical_role,
    tree.evidence_state,
    tree.is_drift,
    tree.is_legacy,
    tree.children_required,
    tree.direct_file_count,
    tree.ddd_owner,
    tree.cq_rails,
    tree.is_materialized_component,
    case
      when reparent.raw_component is not null then jsonb_build_array(reparent.raw_component)
      else tree.raw_units
    end as raw_units
  from planning_query_store.component_engineering_component_tree_query tree
  left join planning_query_store.governance_component_reparent_overrides reparent
    on reparent.component_id = tree.component_id
),
component_closure(ancestor_component_id, descendant_component_id, visited) as (
  select
    tree.component_id,
    tree.component_id,
    array[tree.component_id]::text[] as visited
  from effective_tree tree
  union all
  select
    closure.ancestor_component_id,
    child.component_id,
    closure.visited || child.component_id
  from component_closure closure
  join effective_tree child
    on child.parent_component_id = closure.descendant_component_id
  where not child.component_id = any(closure.visited)
),
descendant_counts as (
  select
    closure.ancestor_component_id as component_id,
    count(distinct closure.descendant_component_id)::int as descendant_component_count,
    coalesce(sum(descendant.direct_file_count), 0)::int as descendant_file_count
  from component_closure closure
  join effective_tree descendant
    on descendant.component_id = closure.descendant_component_id
  group by closure.ancestor_component_id
),
children as (
  select
    parent_component_id as component_id,
    count(*)::int as children_count
  from effective_tree
  where parent_component_id is not null
  group by parent_component_id
)
select
  tree.component_id,
  tree.name,
  tree.component_level,
  tree.parent_component_id,
  tree.root_unit,
  tree.domain_unit,
  tree.status,
  tree.governance_state,
  tree.canonical_role,
  tree.evidence_state,
  tree.is_drift,
  tree.is_legacy,
  tree.children_required,
  tree.direct_file_count,
  coalesce(counts.descendant_component_count, 1)::int as descendant_component_count,
  coalesce(counts.descendant_file_count, tree.direct_file_count, 0)::int as descendant_file_count,
  tree.ddd_owner,
  tree.cq_rails,
  tree.is_materialized_component,
  coalesce(children.children_count, 0) > 0 as has_children,
  coalesce(children.children_count, 0) = 0 as is_leaf_component,
  tree.raw_units
from effective_tree tree
left join descendant_counts counts
  on counts.component_id = tree.component_id
left join children
  on children.component_id = tree.component_id;

create or replace view component_engineering.file_ownership_query as
select
  ownership.file_path,
  ownership.leaf_component_id,
  ownership.owning_unit,
  ownership.root_unit,
  ownership.domain_unit,
  ownership.owner_level,
  ownership.governance_state,
  ownership.canonical_role,
  ownership.evidence_state,
  ownership.is_drift,
  ownership.is_legacy,
  ownership.ddd_owner,
  ownership.cq_rails,
  ownership.file_role,
  tree.parent_component_id,
  tree.component_level,
  tree.is_leaf_component,
  ownership.source_path,
  ownership.source_content_sha256
from planning_query_store.component_engineering_file_ownership_query ownership
left join component_engineering.component_tree_query tree
  on tree.component_id = ownership.leaf_component_id;

create or replace view component_engineering.component_quality_query as
with recursive component_descendants as (
  select
    tree.component_id as ancestor_component_id,
    tree.component_id as descendant_component_id,
    array[tree.component_id]::text[] as visited
  from component_engineering.component_tree_query tree
  union all
  select
    closure.ancestor_component_id,
    child.component_id as descendant_component_id,
    closure.visited || child.component_id
  from component_descendants closure
  join component_engineering.component_tree_query child
    on child.parent_component_id = closure.descendant_component_id
  where not child.component_id = any(closure.visited)
),
effective_file_counts as (
  select
    tree.component_id,
    count(file_owner.file_path) filter (
      where file_owner.leaf_component_id = tree.component_id
    )::int as direct_file_count,
    count(file_owner.file_path) filter (
      where closure.descendant_component_id is not null
    )::int as descendant_file_count,
    count(file_owner.file_path) filter (
      where file_owner.leaf_component_id = tree.component_id
        and file_owner.file_role = 'test'
    )::int as test_file_count
  from component_engineering.component_tree_query tree
  left join component_descendants closure
    on closure.ancestor_component_id = tree.component_id
  left join component_engineering.file_ownership_query file_owner
    on file_owner.leaf_component_id = closure.descendant_component_id
  group by tree.component_id
),
rule_rollup as (
  select
    rule_eval.subject_id as component_id,
    count(*)::int as rule_count,
    count(*) filter (where rule_eval.evaluation_state <> 'pass')::int as failing_rule_count,
    count(*) filter (
      where rule_eval.evaluation_state <> 'pass'
        and rule_eval.severity = 'error'
    )::int as error_count,
    count(*) filter (
      where rule_eval.evaluation_state <> 'pass'
        and rule_eval.severity = 'warning'
    )::int as warning_count,
    coalesce(
      array_agg(distinct rule_eval.drift_code) filter (
        where rule_eval.evaluation_state <> 'pass'
          and rule_eval.drift_code is not null
      ),
      array[]::text[]
    ) as drift_codes
  from planning_query_store.component_engineering_rule_evaluation_query rule_eval
  group by rule_eval.subject_id
),
children as (
  select
    parent_component_id as component_id,
    count(*)::int as children_count
  from component_engineering.component_tree_query
  where parent_component_id is not null
    and component_level = 'component'
  group by parent_component_id
)
select
  tree.component_id,
  tree.name,
  tree.component_level,
  tree.parent_component_id,
  tree.governance_state,
  case
    when coalesce(rule_rollup.error_count, 0) > 0 then 'fail'
    when coalesce(rule_rollup.warning_count, 0) > 0 then 'warn'
    else 'pass'
  end as quality_state,
  coalesce(effective_file_counts.direct_file_count, 0) as direct_file_count,
  coalesce(effective_file_counts.descendant_file_count, 0) as descendant_file_count,
  coalesce(children.children_count, 0) as children_count,
  coalesce(effective_file_counts.test_file_count, 0) as test_file_count,
  coalesce(rule_rollup.rule_count, 0) as rule_count,
  coalesce(rule_rollup.failing_rule_count, 0) as failing_rule_count,
  coalesce(rule_rollup.error_count, 0) as error_count,
  coalesce(rule_rollup.warning_count, 0) as warning_count,
  coalesce(rule_rollup.drift_codes, array[]::text[]) as drift_codes
from component_engineering.component_tree_query tree
left join effective_file_counts
  on effective_file_counts.component_id = tree.component_id
left join rule_rollup
  on rule_rollup.component_id = tree.component_id
left join children
  on children.component_id = tree.component_id;
