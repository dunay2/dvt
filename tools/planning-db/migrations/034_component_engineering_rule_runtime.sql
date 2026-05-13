create or replace view planning_query_store.component_engineering_rule_catalog_query as
select *
from (
  values
    (
      'CEI-ID-002',
      'Every unit parent resolves in the full governance unit tree',
      'identity',
      'error',
      'unit',
      'governance_unit_query',
      'planning_query_store',
      'component_engineering_rule_evaluation_query',
      'unresolved_parent',
      'docs/architecture/components/ci-governance/component-engineering-invariants.md',
      'Add the missing parent unit or correct the child parent path in the governance unit index.',
      'pnpm planning:db:query component-rule-evaluations --kind CEI-ID-002 --state fail'
    ),
    (
      'CEI-ID-006',
      'Component tree parents may be assemblies from the full unit tree',
      'identity',
      'error',
      'component',
      'component_engineering_component_tree_query',
      'planning_query_store',
      'component_engineering_rule_evaluation_query',
      'component_parent_missing_from_unit_tree',
      'docs/architecture/components/ci-governance/component-engineering-invariants.md',
      'Keep component parent validation against governance_unit_query instead of the component-only tree.',
      'pnpm planning:db:query component-rule-evaluations --kind CEI-ID-006 --state fail'
    ),
    (
      'CEI-RESP-001',
      'Canonical components declare an owned concern',
      'responsibility',
      'warning',
      'component',
      'governance_unit_query.raw_units',
      'planning_query_store',
      'component_engineering_rule_evaluation_query',
      'missing_owned_concern',
      'docs/architecture/components/ci-governance/component-engineering-invariants.md',
      'Add ownedConcern metadata to the component unit that owns the responsibility.',
      'pnpm planning:db:query component-rule-evaluations --kind CEI-RESP-001 --state fail'
    ),
    (
      'CEI-API-001',
      'Canonical components expose a public API or command/query rail',
      'interface',
      'warning',
      'component',
      'governance_unit_query.raw_units',
      'planning_query_store',
      'component_engineering_rule_evaluation_query',
      'missing_public_api',
      'docs/architecture/components/ci-governance/component-engineering-invariants.md',
      'Add publicApi metadata or bind the component to a specific command/query rail.',
      'pnpm planning:db:query component-rule-evaluations --kind CEI-API-001 --state fail'
    ),
    (
      'CEI-SIZE-005',
      'Assemblies that require children have at least one governed child',
      'size',
      'error',
      'unit',
      'governance_unit_query',
      'planning_query_store',
      'component_engineering_rule_evaluation_query',
      'children_required_without_children',
      'docs/architecture/components/ci-governance/component-engineering-invariants.md',
      'Split the assembly into child units or mark childrenRequired false only when it is genuinely a leaf.',
      'pnpm planning:db:query component-rule-evaluations --kind CEI-SIZE-005 --state fail'
    ),
    (
      'CEI-SRC-004',
      'Tracked files resolve to a leaf component owner',
      'source',
      'error',
      'file',
      'component_engineering_file_ownership_query',
      'planning_query_store',
      'component_engineering_rule_evaluation_query',
      'file_without_leaf_component',
      'docs/architecture/components/ci-governance/component-engineering-invariants.md',
      'Move the file ownership to a leaf component or add the missing child component before assigning files.',
      'pnpm planning:db:query component-rule-evaluations --kind CEI-SRC-004 --state fail'
    )
) as rule_catalog(
  rule_id,
  name,
  category,
  severity,
  subject_level,
  subject_scope,
  predicate_owner,
  evaluation_view,
  drift_code,
  governing_doc,
  remediation,
  validation_command
);

create or replace view planning_query_store.component_engineering_rule_evaluation_query as
with semantic_component_units as (
  select
    unit.*
  from planning_query_store.governance_unit_query unit
  where unit.level = 'component'
    and coalesce(unit.status, unit.governance_state) in ('canonical', 'review')
),
component_semantics as (
  select
    unit.unit_id,
    exists (
      select 1
      from jsonb_array_elements(coalesce(unit.raw_units, '[]'::jsonb)) as raw_unit(value)
      where nullif(btrim(raw_unit.value->>'ownedConcern'), '') is not null
    ) as has_owned_concern,
    exists (
      select 1
      from jsonb_array_elements(coalesce(unit.raw_units, '[]'::jsonb)) as raw_unit(value)
      where nullif(btrim(raw_unit.value->>'publicApi'), '') is not null
    ) as has_public_api,
    nullif(btrim(coalesce(unit.cq_rails, '')), '') is not null
      and unit.cq_rails !~* '^none(\s|$|-)' as has_command_query_rail
  from semantic_component_units unit
)
select
  rule.rule_id,
  rule.name as rule_name,
  rule.category,
  rule.severity,
  unit.unit_id as subject_id,
  unit.level as subject_level,
  unit.name as subject_name,
  case
    when parent.unit_id is null then 'fail'
    else 'pass'
  end as evaluation_state,
  case
    when parent.unit_id is null then rule.drift_code
    else null
  end as drift_code,
  case
    when parent.unit_id is null then 'Parent unit is absent from governance_unit_query.'
    else 'Parent unit resolves in governance_unit_query.'
  end as evidence,
  rule.remediation,
  jsonb_build_object(
    'parentId', unit.parent_id,
    'parentLevel', parent.level,
    'sourceView', 'governance_unit_query'
  ) as metadata
from planning_query_store.governance_unit_query unit
join planning_query_store.component_engineering_rule_catalog_query rule
  on rule.rule_id = 'CEI-ID-002'
left join planning_query_store.governance_unit_query parent
  on parent.unit_id = unit.parent_id
where unit.parent_id is not null
union all
select
  rule.rule_id,
  rule.name as rule_name,
  rule.category,
  rule.severity,
  component.component_id as subject_id,
  component.component_level as subject_level,
  component.name as subject_name,
  case
    when parent.unit_id is null then 'fail'
    else 'pass'
  end as evaluation_state,
  case
    when parent.unit_id is null then rule.drift_code
    else null
  end as drift_code,
  case
    when parent.unit_id is null then 'Component parent is absent from the full governance unit tree.'
    else 'Component parent resolves in the full governance unit tree.'
  end as evidence,
  rule.remediation,
  jsonb_build_object(
    'parentComponentId', component.parent_component_id,
    'parentLevel', parent.level,
    'sourceView', 'component_engineering_component_tree_query'
  ) as metadata
from planning_query_store.component_engineering_component_tree_query component
join planning_query_store.component_engineering_rule_catalog_query rule
  on rule.rule_id = 'CEI-ID-006'
left join planning_query_store.governance_unit_query parent
  on parent.unit_id = component.parent_component_id
where component.parent_component_id is not null
union all
select
  rule.rule_id,
  rule.name as rule_name,
  rule.category,
  rule.severity,
  unit.unit_id as subject_id,
  unit.level as subject_level,
  unit.name as subject_name,
  case
    when semantic.has_owned_concern then 'pass'
    else 'fail'
  end as evaluation_state,
  case
    when semantic.has_owned_concern then null
    else rule.drift_code
  end as drift_code,
  case
    when semantic.has_owned_concern then 'ownedConcern metadata is present.'
    else 'ownedConcern metadata is missing.'
  end as evidence,
  rule.remediation,
  jsonb_build_object(
    'requiredField', 'ownedConcern',
    'sourceView', 'governance_unit_query.raw_units'
  ) as metadata
from semantic_component_units unit
join component_semantics semantic
  on semantic.unit_id = unit.unit_id
join planning_query_store.component_engineering_rule_catalog_query rule
  on rule.rule_id = 'CEI-RESP-001'
union all
select
  rule.rule_id,
  rule.name as rule_name,
  rule.category,
  rule.severity,
  unit.unit_id as subject_id,
  unit.level as subject_level,
  unit.name as subject_name,
  case
    when semantic.has_public_api or semantic.has_command_query_rail then 'pass'
    else 'fail'
  end as evaluation_state,
  case
    when semantic.has_public_api or semantic.has_command_query_rail then null
    else rule.drift_code
  end as drift_code,
  case
    when semantic.has_public_api or semantic.has_command_query_rail then
      'publicApi metadata or command/query rail is present.'
    else 'publicApi metadata and command/query rail are missing.'
  end as evidence,
  rule.remediation,
  jsonb_build_object(
    'requiredField', 'publicApi',
    'cqRails', unit.cq_rails,
    'sourceView', 'governance_unit_query.raw_units'
  ) as metadata
from semantic_component_units unit
join component_semantics semantic
  on semantic.unit_id = unit.unit_id
join planning_query_store.component_engineering_rule_catalog_query rule
  on rule.rule_id = 'CEI-API-001'
union all
select
  rule.rule_id,
  rule.name as rule_name,
  rule.category,
  rule.severity,
  unit.unit_id as subject_id,
  unit.level as subject_level,
  unit.name as subject_name,
  case
    when exists (
      select 1
      from planning_query_store.governance_unit_query child
      where child.parent_id = unit.unit_id
    ) then 'pass'
    else 'fail'
  end as evaluation_state,
  case
    when exists (
      select 1
      from planning_query_store.governance_unit_query child
      where child.parent_id = unit.unit_id
    ) then null
    else rule.drift_code
  end as drift_code,
  case
    when exists (
      select 1
      from planning_query_store.governance_unit_query child
      where child.parent_id = unit.unit_id
    ) then 'Unit that requires children has at least one governed child.'
    else 'Unit requires children but has no governed child.'
  end as evidence,
  rule.remediation,
  jsonb_build_object(
    'childrenRequired', unit.children_required,
    'sourceView', 'governance_unit_query'
  ) as metadata
from planning_query_store.governance_unit_query unit
join planning_query_store.component_engineering_rule_catalog_query rule
  on rule.rule_id = 'CEI-SIZE-005'
where unit.children_required = true
union all
select
  rule.rule_id,
  rule.name as rule_name,
  rule.category,
  rule.severity,
  coalesce(file_owner.leaf_component_id, file_owner.owning_unit, file_owner.file_path) as subject_id,
  'file'::text as subject_level,
  file_owner.file_path as subject_name,
  case
    when file_owner.leaf_component_id is not null
      and file_owner.is_leaf_component is true then 'pass'
    else 'fail'
  end as evaluation_state,
  case
    when file_owner.leaf_component_id is not null
      and file_owner.is_leaf_component is true then null
    else rule.drift_code
  end as drift_code,
  case
    when file_owner.leaf_component_id is not null
      and file_owner.is_leaf_component is true then 'File resolves to a leaf component.'
    else 'File does not resolve to a leaf component.'
  end as evidence,
  rule.remediation,
  jsonb_build_object(
    'filePath', file_owner.file_path,
    'leafComponentId', file_owner.leaf_component_id,
    'owningUnit', file_owner.owning_unit,
    'fileRole', file_owner.file_role,
    'sourceView', 'component_engineering_file_ownership_query'
  ) as metadata
from planning_query_store.component_engineering_file_ownership_query file_owner
join planning_query_store.component_engineering_rule_catalog_query rule
  on rule.rule_id = 'CEI-SRC-004';

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
  from planning_query_store.component_engineering_file_ownership_query file_owner
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
  from planning_query_store.component_engineering_rule_evaluation_query evaluation
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
from planning_query_store.component_engineering_rule_evaluation_query evaluation
where evaluation.evaluation_state = 'fail'
  and evaluation.drift_code is not null;
