create materialized view if not exists planning_query_store.component_engineering_rule_evaluation_projection as
select
  rule_id,
  rule_name,
  category,
  severity,
  subject_id,
  subject_level,
  subject_name,
  evaluation_state,
  drift_code,
  evidence,
  remediation,
  metadata
from planning_query_store.component_engineering_rule_evaluation_query
with data;

create index if not exists component_engineering_rule_evaluation_projection_state_idx
  on planning_query_store.component_engineering_rule_evaluation_projection (
    evaluation_state,
    drift_code,
    subject_id
  );

create index if not exists component_engineering_rule_evaluation_projection_subject_idx
  on planning_query_store.component_engineering_rule_evaluation_projection (
    subject_id,
    evaluation_state
  );

create index if not exists component_engineering_rule_evaluation_projection_rule_idx
  on planning_query_store.component_engineering_rule_evaluation_projection (
    rule_id,
    evaluation_state,
    subject_id
  );

create or replace view planning_query_store.component_engineering_quality_query as
with unit_children as (
  select
    parent.unit_id,
    count(child.unit_id)::int as children_count
  from planning_query_store.governance_unit_query parent
  left join planning_query_store.governance_unit_query child
    on child.parent_id = parent.unit_id
  group by parent.unit_id
),
unit_tests as (
  select
    file_owner.leaf_component_id as component_id,
    count(*)::int as test_file_count
  from planning_query_store.component_engineering_file_ownership_projection file_owner
  where file_owner.file_role = 'test'
  group by file_owner.leaf_component_id
),
unit_rule_summary as (
  select
    evaluation.subject_id as component_id,
    count(*)::int as rule_count,
    count(*) filter (where evaluation.evaluation_state = 'fail')::int as failing_rule_count,
    count(*) filter (
      where evaluation.evaluation_state = 'fail'
        and evaluation.severity = 'error'
    )::int as error_count,
    count(*) filter (
      where evaluation.evaluation_state = 'fail'
        and evaluation.severity = 'warning'
    )::int as warning_count,
    coalesce(
      array_agg(distinct evaluation.drift_code order by evaluation.drift_code)
        filter (
          where evaluation.evaluation_state = 'fail'
            and evaluation.drift_code is not null
        ),
      array[]::text[]
    ) as drift_codes
  from planning_query_store.component_engineering_rule_evaluation_projection evaluation
  group by evaluation.subject_id
)
select
  unit.unit_id as component_id,
  unit.name,
  unit.level as component_level,
  unit.parent_id as parent_component_id,
  unit.governance_state,
  case
    when coalesce(rule_summary.error_count, 0) > 0 then 'fail'
    when coalesce(rule_summary.warning_count, 0) > 0 then 'warn'
    else 'pass'
  end as quality_state,
  unit.direct_file_count,
  unit.descendant_file_count,
  coalesce(children.children_count, 0)::int as children_count,
  coalesce(tests.test_file_count, 0)::int as test_file_count,
  coalesce(rule_summary.rule_count, 0)::int as rule_count,
  coalesce(rule_summary.failing_rule_count, 0)::int as failing_rule_count,
  coalesce(rule_summary.error_count, 0)::int as error_count,
  coalesce(rule_summary.warning_count, 0)::int as warning_count,
  coalesce(rule_summary.drift_codes, array[]::text[]) as drift_codes
from planning_query_store.governance_unit_query unit
left join unit_children children
  on children.unit_id = unit.unit_id
left join unit_tests tests
  on tests.component_id = unit.unit_id
left join unit_rule_summary rule_summary
  on rule_summary.component_id = unit.unit_id;

create or replace view planning_query_store.component_engineering_drift_query as
select
  evaluation.subject_id as component_id,
  evaluation.drift_code,
  evaluation.metadata
from planning_query_store.component_engineering_rule_evaluation_projection evaluation
where evaluation.evaluation_state = 'fail'
  and evaluation.drift_code is not null;

create or replace view component_engineering.rule_evaluation_query as
select
  rule_id,
  rule_name,
  category,
  severity,
  subject_id,
  subject_level,
  subject_name,
  evaluation_state,
  drift_code,
  evidence,
  remediation,
  metadata
from planning_query_store.component_engineering_rule_evaluation_projection;

create or replace view component_engineering.component_drift_query as
select
  component_id,
  drift_code,
  metadata
from planning_query_store.component_engineering_drift_query;
