create or replace view planning_query_store.component_engineering_quality_query as
with recursive component_descendants as (
  select
    tree.component_id as ancestor_component_id,
    tree.component_id as descendant_component_id
  from planning_query_store.component_engineering_component_tree_query tree
  where tree.component_level = 'component'
  union all
  select
    closure.ancestor_component_id,
    child.component_id as descendant_component_id
  from component_descendants closure
  join planning_query_store.component_engineering_component_tree_query child
    on child.parent_component_id = closure.descendant_component_id
   and child.component_level = 'component'
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
  from planning_query_store.component_engineering_component_tree_query tree
  left join component_descendants closure
    on closure.ancestor_component_id = tree.component_id
  left join planning_query_store.component_engineering_file_ownership_query file_owner
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
  from planning_query_store.component_engineering_component_tree_query
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
from planning_query_store.component_engineering_component_tree_query tree
left join effective_file_counts
  on effective_file_counts.component_id = tree.component_id
left join rule_rollup
  on rule_rollup.component_id = tree.component_id
left join children
  on children.component_id = tree.component_id;

create or replace view component_engineering.component_quality_query as
select
  component_id,
  name,
  component_level,
  parent_component_id,
  governance_state,
  quality_state,
  direct_file_count,
  descendant_file_count,
  children_count,
  test_file_count,
  rule_count,
  failing_rule_count,
  error_count,
  warning_count,
  drift_codes
from planning_query_store.component_engineering_quality_query;
