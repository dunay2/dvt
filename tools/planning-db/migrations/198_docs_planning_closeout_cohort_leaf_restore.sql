-- Restore planning closeout cohort leaves now that governed ownership patterns,
-- not only physical directories, are the component file-ownership authority.
-- Old closeout evidence is not deprecated by age; only the obsolete planning
-- catalog -> cohort relations are deprecated because the closeout aggregate is
-- now the correct parent.

drop table if exists pg_temp.docs_planning_closeout_cohort_leaf_map;

create temporary table docs_planning_closeout_cohort_leaf_map (
  component_id text primary key,
  name text not null,
  repo_path text not null,
  ddd_owner text not null,
  rail_name text not null,
  owned_concern text not null,
  reason_to_change text not null,
  public_contract text not null,
  fowler_signal text not null,
  owns text[] not null,
  test_path text not null,
  validation_command text not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null,
  deprecated_relation_id text not null
);

insert into docs_planning_closeout_cohort_leaf_map (
  component_id,
  name,
  repo_path,
  ddd_owner,
  rail_name,
  owned_concern,
  reason_to_change,
  public_contract,
  fowler_signal,
  owns,
  test_path,
  validation_command,
  maturity_score,
  criticality,
  relation_suffix,
  deprecated_relation_id
)
values
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
    'Planning closeout records 2026-03',
    'docs/planning/closeouts/20260315-adapter-postgres-phase1-extraction-closeout.md',
    'PlanningCloseoutMarch2026ReadModel',
    'ReadPlanningCloseoutRecords202603',
    'March 2026 planning closeout evidence records',
    'March 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'March 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202603*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm planning:db:query component-profile --component SYS-DOCS-PLANNING-CLOSEOUTS-202603 --no-refresh --limit 80',
    72,
    'medium',
    '202603',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202603'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
    'Planning closeout records 2026-04',
    'docs/planning/closeouts/20260401-dhm-ws1-start-run-boundary-residual-hardening-closeout.md',
    'PlanningCloseoutApril2026ReadModel',
    'ReadPlanningCloseoutRecords202604',
    'April 2026 planning closeout evidence records',
    'April 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'April 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202604*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm planning:db:query component-profile --component SYS-DOCS-PLANNING-CLOSEOUTS-202604 --no-refresh --limit 80',
    72,
    'medium',
    '202604',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202604'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
    'Planning closeout records 2026-05',
    'docs/planning/closeouts/20260502-s08-temporal-legacy-removal-closeout.md',
    'PlanningCloseoutMay2026ReadModel',
    'ReadPlanningCloseoutRecords202605',
    'May 2026 planning closeout evidence records',
    'May 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'May 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202605*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm planning:db:query component-profile --component SYS-DOCS-PLANNING-CLOSEOUTS-202605 --no-refresh --limit 80',
    72,
    'medium',
    '202605',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202605'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
    'Planning closeout records 2026-06',
    'docs/planning/closeouts/20260601-ai-targeted-governance-report-tests-closeout.md',
    'PlanningCloseoutJune2026ReadModel',
    'ReadPlanningCloseoutRecords202606',
    'June 2026 planning closeout evidence records',
    'June 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'June 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202606*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm planning:db:query component-profile --component SYS-DOCS-PLANNING-CLOSEOUTS-202606 --no-refresh --limit 80',
    72,
    'medium',
    '202606',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202606'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY',
    'Planning legacy closeout records',
    'docs/planning/closeouts/index.md',
    'PlanningLegacyCloseoutReadModel',
    'ReadPlanningLegacyCloseoutRecords',
    'legacy non-date planning closeout evidence records kept explicit for review',
    'Legacy closeout naming, historical evidence retention, or closeout retirement changes.',
    'Legacy planning closeout evidence boundary.',
    'documentation_lifecycle_legacy',
    array[
      'docs/planning/closeouts/engine-deps-refactor-closeout.md',
      'docs/planning/closeouts/F-02-closeout.md',
      'docs/planning/closeouts/F-04-D-E-composition-root-foundation-closeout.md',
      'docs/planning/closeouts/F-04-F-capabilities-port-and-route-query-boundary-closeout.md',
      'docs/planning/closeouts/F-04-RESIDUAL-A-root-provider-guard-closeout.md',
      'docs/planning/closeouts/F-04-RESIDUAL-B-provider-override-test-seams-closeout.md',
      'docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout.md',
      'docs/planning/closeouts/F-04-RISK-B-mock-workspace-isolation-closeout.md',
      'docs/planning/closeouts/G7.1-closeout.md',
      'docs/planning/closeouts/index.md'
    ]::text[],
    'scripts/docs-doctor.cjs',
    'pnpm docs:quality:check && pnpm planning:db:query component-profile --component SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY --no-refresh --limit 80',
    68,
    'medium',
    'LEGACY',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-LEGACY'
  );

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
  'PLANNING-DB-DOCS-CLOSEOUT-COHORT-LEAF-RESTORE-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning closeout cohort leaf restoration',
  'Architecture / Planning DB / Documentation',
  'review',
  'SYS-DOCS-PLANNING-CLOSEOUTS directly owned 439 tracked closeout files after migration 187 deprecated the month cohorts because they did not have unique physical directories. Current Planning DB ownership supports governed file patterns, so the canonical model is an aggregate closeout component with active cohort leaves for date-coded and legacy records. Old closeout evidence is not deprecated by age; only obsolete planning-catalog-to-cohort relations are deprecated because the aggregate is the correct parent.',
  'responsibility_overload',
  'ReadPlanningCloseoutRecords;ReadPlanningCloseoutRecords202603;ReadPlanningCloseoutRecords202604;ReadPlanningCloseoutRecords202605;ReadPlanningCloseoutRecords202606;ReadPlanningLegacyCloseoutRecords',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select
  'PLANNING-DB-DOCS-CLOSEOUT-COHORT-LEAF-RESTORE-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-PLANNING-CLOSEOUTS'::text, 'may_update'::text
  union all
  select 'path', 'docs/planning/closeouts/**', 'may_update'
  union all
  select 'component', component_id, 'may_update'
  from docs_planning_closeout_cohort_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_planning_closeout_cohort_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/198_docs_planning_closeout_cohort_leaf_restore.sql',
  source_content_sha256 = md5('SYS-DOCS-PLANNING-CLOSEOUTS:198') || md5('closeout-cohort-aggregate:198'),
  children_required = true,
  owned_concern = 'Owns the aggregate planning closeout boundary; concrete closeout files resolve to date-coded or legacy cohort child components.',
  cq_rails = 'ReadPlanningCloseoutRecords'
where component_id = 'SYS-DOCS-PLANNING-CLOSEOUTS';

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'tools/planning-db/migrations/198_docs_planning_closeout_cohort_leaf_restore.sql',
  md5(component_id || ':198') || md5(repo_path || rail_name || ':closeout-cohort-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_planning_closeout_cohort_leaf_map
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from docs_planning_closeout_cohort_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.governance_component_local_semantic_items
set item_value = 'Restored as an active child of SYS-DOCS-PLANNING-CLOSEOUTS because governed ownership patterns now define closeout cohort ownership without requiring unique physical directories.'
where
  component_id in (select component_id from docs_planning_closeout_cohort_leaf_map)
  and item_kind = 'transition'
  and item_value like 'Superseded by SYS-DOCS-PLANNING-CLOSEOUTS%';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, 'Own ' || owned_concern || '.' as item_value, 0 as item_order
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'invariant', 'Tracked planning closeout files matching this cohort must resolve here rather than to SYS-DOCS-PLANNING-CLOSEOUTS.', 0
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'non_goal', 'Closeout evidence is not deprecated by age. Only explicitly obsolete relations or nonfunctional files are deprecated.', 0
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-PLANNING-CLOSEOUTS owns no direct closeout files.', 0
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, documentation-lifecycle, source-drift, and filesystem-coverage readers.', 0
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_planning_closeout_cohort_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_planning_closeout_cohort_leaf_map
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  public_contract = 'Planning closeout evidence aggregate boundary. Concrete closeout files resolve to cohort child components.',
  status = 'review',
  parent_component_id = 'SYS-DOCS-GOVERNANCE-PLANNING',
  updated_at = now()
where component_id = 'SYS-DOCS-PLANNING-CLOSEOUTS';

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'none',
  criticality,
  'review',
  maturity_score,
  'SYS-DOCS-PLANNING-CLOSEOUTS'
from docs_planning_closeout_cohort_leaf_map
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  'Own ' || owned_concern || '.',
  reason_to_change,
  ddd_owner,
  'implemented'
from docs_planning_closeout_cohort_leaf_map
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-DOCS',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from docs_planning_closeout_cohort_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

update architecture.component_relation relation
set
  status = 'drift',
  failure_mode = 'Deprecated by PLANNING-DB-DOCS-CLOSEOUT-COHORT-LEAF-RESTORE-20260619 because closeout cohorts are contained by SYS-DOCS-PLANNING-CLOSEOUTS, not directly by SYS-DOCS-GOVERNANCE-PLANNING.',
  updated_at = now()
from docs_planning_closeout_cohort_leaf_map leaf
where relation.relation_id = leaf.deprecated_relation_id;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-' || relation_suffix,
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this closeout cohort leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local docs governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_planning_closeout_cohort_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(rail_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  rail_name,
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-DOCS',
  'CONTRACT-' || component_id || '-DOCS',
  array[
    'missing closeout cohort ownership',
    'closeout evidence deprecated by age only',
    'obsolete planning catalog relation remains active'
  ]::text[],
  'implemented'
from docs_planning_closeout_cohort_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  'TEST-' || component_id || '-DOCS',
  component_id,
  test_path,
  'architecture',
  'boundary',
  true,
  validation_command
from docs_planning_closeout_cohort_leaf_map
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-DOCS',
  component_id,
  'Planning closeout cohort is observable through component-profile and docs quality checks.',
  'log',
  true,
  'implemented'
from docs_planning_closeout_cohort_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_planning_closeout_cohort_leaf_map;
