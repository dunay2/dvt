-- Canonicalize Planning DB query limit parsing as an owned component.
-- This records the component created through CreateGovernanceComponent so fresh
-- CI databases keep the same component/file authority as the local rail write.

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
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
  'planning_query_store.governance_component_local_definitions',
  'fbc10876c0bdd407a1b62a0d7870e0751462b8992b823c9803639a06f8a261c6',
  0,
  'Planning DB query limit helper',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-DVT',
  'SYS-DVT',
  'canonical',
  false,
  'Owns canonical Planning DB query limit parsing reused by query read-model adapters.',
  'CodeSymbolDuplicateReadModel',
  'DetectCodeSymbolDuplicates; InspectCodeSymbolInventory',
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
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
  'owns',
  'scripts/planning-db/query-limit.cjs',
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
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'responsibility',
    'Normalize --limit parsing for Planning DB query read models.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'reason_to_change',
    'Planning DB query limit semantics or duplicate symbol remediation changes.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'public_api',
    'parseLimit(value, defaultLimit)',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'invariant',
    'All Planning DB query read-model adapters must import this helper instead of defining local parseLimit copies.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'transition',
    'review -> implemented requires planning-db-query tests and code-symbol duplicate query to show no parseLimit exact duplicate group.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'consumer',
    'Planning DB query read-model modules and planning-db-query CLI.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'fowler_signal',
    'duplicated_function',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  'PLANNING-DB-QUERY-LIMIT-HELPER-COMPONENT-20260617',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Canonical Planning DB query limit helper component',
  'Architecture / Planning DB',
  'implemented',
  'Repeated parseLimit implementations in Planning DB query adapters are a duplicated-function signal. The helper component owns the canonical parser and keeps query adapters from carrying parallel semantics.',
  'hidden_authority',
  'DetectCodeSymbolDuplicates',
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
    'PLANNING-DB-QUERY-LIMIT-HELPER-COMPONENT-20260617',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-QUERY-LIMIT-HELPER-COMPONENT-20260617',
    'test',
    'scripts/planning-db-query.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-QUERY-LIMIT-HELPER-COMPONENT-20260617',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  parent_component_id
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'Repository governance automation scripts',
  'module',
  'infra',
  'Repository Automation',
  'scripts',
  'Executable repository governance, docs, planning, quality, and CI support scripts.',
  'node',
  'medium',
  'review',
  null
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
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

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
  parent_component_id
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
  'Planning DB query limit helper',
  'module',
  'infra',
  'CodeSymbolDuplicateReadModel',
  'scripts/planning-db/query-limit.cjs',
  'parseLimit(value, defaultLimit)',
  'node',
  'medium',
  'implemented',
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
  'RESP-SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'Owns executable repository governance, docs, planning, quality, and CI support scripts.',
  'Repository automation script, generator, checker, or CI support behavior changes.',
  'RepositoryAutomation',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
  'Normalize Planning DB query limit parsing through one shared helper.',
  'Planning DB query limit semantics or duplicate symbol remediation changes.',
  'CodeSymbolDuplicateReadModel',
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
  'REL-CI-GOVERNANCE-SCRIPTS-CONTAINS-PLANNING-DB-QUERY-LIMIT',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
  'contains',
  'outbound',
  'sync',
  'not_applicable',
  'repository_governance',
  jsonb_build_array(
    'scripts/planning-db/query-limit.cjs',
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
  'TEST-CI-GOVERNANCE-SCRIPTS-UNIT-COVERAGE',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'scripts/check-governance-unit-coverage.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/check-governance-unit-coverage.test.cjs'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

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
  'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT',
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
