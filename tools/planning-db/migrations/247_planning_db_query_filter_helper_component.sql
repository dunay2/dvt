-- Canonicalize Planning DB query equality filtering as an owned helper
-- component. This closes the active appendFilter duplicate family without
-- creating another query rail or hiding remaining duplicate-symbol findings.

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
  'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Canonical Planning DB query filter helper component',
  'Architecture / Planning DB',
  'implemented',
  'appendFilter was repeated across the Planning DB query CLI, query read models, and DB-first inventory readers. A single helper keeps equality-filter parameter binding canonical while preserving each read model as the owner of its SQL surface.',
  'hidden_authority',
  'DetectCodeSymbolDuplicates;CheckPlanningDbComponentIntegrity;ReadComponentProfile',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
    'path',
    'scripts/planning-db/query-filter.cjs',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
    'path',
    'scripts/planning-db-query.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
    'path',
    'scripts/planning-db/queries/*.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
    'test',
    'scripts/planning-db-query.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-COMPONENT-20260619',
    'query',
    'DetectCodeSymbolDuplicates',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'scripts/planning-db/query-filter.cjs',
  md5('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER:247')
    || md5('planning db query filter helper:247'),
  0,
  'Planning DB query filter helper',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-DVT',
  'SYS-DVT',
  'canonical',
  false,
  'Owns canonical equality-filter predicate and parameter binding for Planning DB query readers.',
  'PlanningDbQueryFilterHelper',
  'DetectCodeSymbolDuplicates;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
  'codex'
)
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
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'owns',
  'scripts/planning-db/query-filter.cjs',
  0
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'responsibility',
    'Normalize equality-filter predicate and parameter binding for Planning DB query read models.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'reason_to_change',
    'Planning DB equality-filter binding semantics or duplicate symbol remediation changes.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'public_api',
    'appendFilter(predicates, params, column, value)',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'invariant',
    'Planning DB query modules must import this helper instead of defining local appendFilter copies.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'transition',
    'active duplicate helper copies -> canonical helper import covered by planning-db-query tests and code-symbol duplicate query.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'consumer',
    'Planning DB query CLI, query read-model modules, DB surface inventory, and frontend inventory readers.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'fowler_signal',
    'duplicated_function',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'Planning DB query filter helper',
  'module',
  'infra',
  'PlanningDbQueryFilterHelper',
  'scripts/planning-db/query-filter.cjs',
  'appendFilter(predicates, params, column, value)',
  'node',
  'medium',
  'implemented',
  86,
  'SYS-CI-GOVERNANCE-SCRIPTS'
)
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
values (
  'RESP-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'Normalize Planning DB query equality filtering through one shared helper.',
  'Planning DB equality-filter binding semantics or duplicate symbol remediation changes.',
  'PlanningDbQueryFilterHelper',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-CI-GOVERNANCE-SCRIPTS-CONTAINS-PLANNING-DB-QUERY-FILTER',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'contains',
  'outbound',
  'sync',
  'local query modules drift into repeated parameter-binding semantics if the helper is bypassed',
  'repository_governance',
  jsonb_build_array(
    'scripts/planning-db/query-filter.cjs',
    'scripts/planning-db-query.test.cjs'
  ),
  'implemented'
)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
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
values (
  'PORT-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER-APPEND',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'AppendPlanningDbQueryFilter',
  'query',
  'inbound',
  null,
  null,
  array[
    'scripts/planning-db-query.test.cjs ignores undefined, null, and empty filter values',
    'scripts/planning-db-query.test.cjs preserves positional parameter order'
  ]::text[],
  'implemented'
)
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
values (
  'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'scripts/planning-db-query.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/planning-db-query.test.cjs'
)
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
values (
  'OBS-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER-TEST-EVIDENCE',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
  'Helper behavior is observable through Planning DB query unit tests and code-symbol duplicate query output; runtime telemetry is not applicable.',
  'log',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
