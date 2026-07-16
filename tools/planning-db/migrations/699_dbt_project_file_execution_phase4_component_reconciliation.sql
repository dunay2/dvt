-- Reconcile the implemented Phase 4 boundaries before product closeout.
-- Product intent remains on the existing PreviewExecutionPlan and StartRun
-- rails. Bundle construction and run-context persistence are ports/adapters,
-- not additional product commands.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'dbt project bundle builder port', 'port', 'application', 'dbt Runtime Admission', 'apps/api/src/application/ports/dbtProjectBundle.ts', 'IDbtProjectBundleBuilder', 'node', 'critical', 'implemented', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'dbt run execution-context writer port', 'port', 'application', 'dbt Runtime Admission', 'apps/api/src/application/ports/dbtRunExecutionContextWriter.ts', 'IDbtRunExecutionContextWriter', 'node', 'critical', 'implemented', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'File dbt run execution-context writer', 'adapter', 'adapter', 'dbt Runtime Admission', 'apps/api/src/infrastructure/dbt/FileDbtRunExecutionContextWriter.ts', 'IDbtRunExecutionContextWriter', 'node', 'critical', 'implemented', 'SYS-API-INFRASTRUCTURE')
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

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
  'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
  'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
  'SYS-API-INFRA-DBT-PROJECT-BUNDLE',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
);

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'tools/planning-db/migrations/699_dbt_project_file_execution_phase4_component_reconciliation.sql', repeat(md5('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE:699'), 2), 0, 'dbt project bundle builder port', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API-ROOT', 'canonical', false, 'Define revision-bound project bundle construction as an outbound StartRun dependency.', 'IDbtProjectBundleBuilder', 'StartRun', 'codex'),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'tools/planning-db/migrations/699_dbt_project_file_execution_phase4_component_reconciliation.sql', repeat(md5('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER:699'), 2), 0, 'dbt run execution-context writer port', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API-ROOT', 'canonical', false, 'Define immutable persistence of a server-created run execution context as an outbound StartRun dependency.', 'IDbtRunExecutionContextWriter', 'StartRun', 'codex'),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'tools/planning-db/migrations/699_dbt_project_file_execution_phase4_component_reconciliation.sql', repeat(md5('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES:699'), 2), 0, 'File dbt run execution-context writer', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API-ROOT', 'canonical', false, 'Persist one immutable, content-addressed run context without accepting caller-owned runtime context.', 'FileDbtRunExecutionContextWriter', '', 'codex')
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
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/699_dbt_project_file_execution_phase4_component_reconciliation.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:699'), 2),
  status = 'canonical',
  cq_rails = case component_id
    when 'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
      then 'PreviewExecutionPlan;ProjectDbtGraphFromFiles'
    else cq_rails
  end,
  revision = revision + 1
where component_id in (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
  'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
  'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
  'SYS-API-INFRA-DBT-PROJECT-BUNDLE',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
);

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change, ddd_owner, status
)
values
  ('RESP-DBT-PROJECT-BUNDLE-PORT', 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'Define revision-bound project bundle construction without selecting storage or archive format.', 'The application-level bundle request, outcome vocabulary, or revision-admission contract changes.', 'IDbtProjectBundleBuilder', 'implemented'),
  ('RESP-DBT-RUN-CONTEXT-WRITER-PORT', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'Define immutable persistence of server-created run execution context.', 'The application-level run-context persistence outcome or addressing contract changes.', 'IDbtRunExecutionContextWriter', 'implemented'),
  ('RESP-DBT-RUN-CONTEXT-FILE-ADAPTER', 'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'Persist one run context once and return a verified file artifact reference.', 'The artifact-store implementation, immutable-write policy, or file addressing changes.', 'FileDbtRunExecutionContextWriter', 'implemented')
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
  'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
  'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
  'SYS-API-INFRA-DBT-PROJECT-BUNDLE',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
);

update architecture.contract
set status = 'implemented', updated_at = now()
where contract_id = 'CONTRACT-PLAN-PREVIEW-PROVENANCE-V1';

update architecture.component_port
set
  component_id = 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE',
  port_name = 'buildRevisionBoundBundle',
  status = 'implemented'
where port_id = 'PORT-DBT-PROJECT-BUNDLE-OUT';

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values (
  'PORT-DBT-RUN-CONTEXT-WRITER-OUT',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER',
  'write',
  'storage',
  'outbound',
  null,
  null,
  array['missing artifact store rejects StartRun', 'unsupported artifact store rejects StartRun', 'existing different bytes are rejected'],
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

update architecture.component_port
set status = 'implemented'
where port_id = 'PORT-DBT-EXECUTION-TARGET-OUT';

update architecture.component_relation
set
  target_component_id = case relation_id
    when 'REL-DBT-RUN-BINDING-CALLS-BUNDLE'
      then 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE'
    else target_component_id
  end,
  status = 'implemented',
  updated_at = now()
where relation_id in (
  'REL-WEB-DBT-FILE-EXECUTION-USES-PROJECTION',
  'REL-WEB-DBT-FILE-EXECUTION-USES-PROVENANCE',
  'REL-DBT-TARGET-CONFIG-IMPLEMENTS-PORT',
  'REL-DBT-RUN-BINDING-READS-TARGET',
  'REL-DBT-RUN-BINDING-CALLS-BUNDLE',
  'REL-DBT-BUNDLE-USES-SNAPSHOT',
  'REL-DBT-ANALYZER-USES-SNAPSHOT',
  'REL-PREVIEW-SELECTION-AUTHORITY-READS-DBT-PROJECTION',
  'REL-PREVIEW-SELECTION-AUTHORITY-USES-SUBGRAPH'
);

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  ('REL-DBT-PROJECT-BUNDLE-ADAPTER-IMPLEMENTS-PORT', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'implements_port', 'inbound', 'async', 'CONTRACT-PLAN-PREVIEW-PROVENANCE-V1', 'Unsafe content, missing storage, or revision mismatch rejects bundle creation.', 'authorized project root', jsonb_build_array('IDbtProjectBundleBuilder'), 'implemented'),
  ('REL-DBT-RUN-BINDING-CALLS-CONTEXT-WRITER', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'calls', 'outbound', 'async', null, 'A run cannot dispatch without an immutable server-created context reference.', 'workspace:run:start', jsonb_build_array('StartRun'), 'implemented'),
  ('REL-DBT-RUN-CONTEXT-FILES-IMPLEMENTS-PORT', 'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'implements_port', 'inbound', 'async', null, 'Unsupported storage or conflicting immutable content rejects context persistence.', 'server artifact store', jsonb_build_array('IDbtRunExecutionContextWriter'), 'implemented')
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

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  ('TEST-WEB-DBT-FILE-PLAN-ACTION', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts', 'unit', 'boundary', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts'),
  ('TEST-WEB-DBT-FILE-EXECUTION-ARCHITECTURE', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web test:architecture:run'),
  ('TEST-DBT-PLAN-EXECUTION-BINDING', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'apps/api/test/application/services/dbtPlanExecutionBinding.test.ts', 'unit', 'boundary', true, 'pnpm --filter dvt-api exec vitest run test/application/services/dbtPlanExecutionBinding.test.ts'),
  ('TEST-DBT-RUN-CONTEXT-FILE-ADAPTER', 'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'apps/api/test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts', 'integration', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
  'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
  'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
  'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE',
  'SYS-API-INFRA-DBT-PROJECT-BUNDLE',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER',
  'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'owns', 'packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts', 0),
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'owns', 'packages/@dvt/contracts/test/plan-preview-provenance.contract.test.ts', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/src/app/views/canvas/useDbtProjectFileExecution.ts', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 2),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts', 3),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 4),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/cypress/support/dbtProjectLive.ts', 5),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 6),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'owns', 'apps/api/src/application/ports/dbtExecutionTarget.ts', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'owns', 'apps/api/src/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.ts', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'owns', 'apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts', 1),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'owns', 'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'owns', 'apps/api/src/application/services/dbtPlanExecutionBinding.ts', 1),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'owns', 'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts', 2),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'owns', 'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts', 3),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'owns', 'apps/api/test/application/services/dbtPlanExecutionBinding.test.ts', 4),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'owns', 'apps/api/src/infrastructure/dbt/dbtProjectSourceSnapshot.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'owns', 'apps/api/test/infrastructure/dbt/dbtProjectSourceSnapshot.test.ts', 1),
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'owns', 'apps/api/src/application/ports/dbtProjectBundle.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'owns', 'apps/api/src/infrastructure/dbt/DbtProjectBundleBuilder.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'owns', 'apps/api/src/infrastructure/dbt/dbtProjectTarArchive.ts', 1),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'owns', 'apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts', 2),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'owns', 'apps/api/src/application/ports/dbtRunExecutionContextWriter.ts', 0),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'owns', 'apps/api/src/infrastructure/dbt/FileDbtRunExecutionContextWriter.ts', 0),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'owns', 'apps/api/test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts', 1),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'owns', 'apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts', 0),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'owns', 'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'public_api', 'PlanPreviewProvenanceSchema;parsePlanPreviewProvenance', 0),
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'transition', 'Unknown preview provenance becomes one validated authority-specific value or a contract rejection.', 0),
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'consumer', 'PreviewExecutionPlan and StartRun admission', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'public_api', 'buildDbtProjectFileExecutionStrategy;useDbtProjectFileExecution', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'transition', 'A fresh file projection and execution selection become one revision-bound Preview request and readiness-aware Run affordance.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'consumer', 'DbtProjectFileCanvas', 0),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'public_api', 'IDbtExecutionTargetResolver.resolve', 0),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'transition', 'Server target configuration availability becomes one complete public identity or unavailable.', 0),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'consumer', 'ProjectDbtGraphFromFiles and DbtRunExecutionContextBindingUseCase', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'public_api', 'ConfiguredDbtExecutionTargetResolver.resolve', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'transition', 'An all-or-none process configuration becomes one secret-free target identity or unavailable.', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'consumer', 'IDbtExecutionTargetResolver composition', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'public_api', 'DbtRunExecutionContextBindingUseCase.execute', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'transition', 'An admitted persisted dbt plan becomes a revision-bound bundle and immutable context reference before delegation to StartRun.', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'consumer', 'Protected StartRun runtime', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'public_api', 'createDbtProjectSourceSnapshot', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'transition', 'An authorized project root becomes one immutable allowed-source directory and deterministic content revision.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'consumer', 'DbtCliProjectAnalyzer and DbtProjectBundleBuilder', 0),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'public_api', 'DbtProjectBundleBuilder.build', 0),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'transition', 'A revision-validated source snapshot becomes one deterministic tar.gz artifact reference.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'consumer', 'IDbtProjectBundleBuilder composition', 0),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'public_api', 'ResolveAuthorizedPreviewSelectionService.execute', 0),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'transition', 'One explicit authority request becomes a server-verified planner graph and executable closure or a typed rejection.', 0),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'consumer', 'PreviewPlanUseCase', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'public_api', 'IDbtProjectBundleBuilder.build', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'invariant', 'An expected project revision is never weakened or replaced while crossing the port.', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'transition', 'An authorized project root and optional expected revision become either one content-addressed bundle reference or one typed rejection.', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'consumer', 'DbtRunExecutionContextBindingUseCase', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'non_goal', 'Choose archive encoding, artifact storage, authorization, or target configuration.', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'public_api', 'IDbtRunExecutionContextWriter.write', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'invariant', 'Only a server-created RunExecutionContext crosses the writer port and the result never reports success without a verifiable reference.', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'transition', 'A run identity and complete context become one immutable reference or one typed storage rejection.', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'consumer', 'DbtRunExecutionContextBindingUseCase', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'non_goal', 'Construct the run context, authorize StartRun, or select an artifact-store implementation.', 0),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'public_api', 'FileDbtRunExecutionContextWriter.write', 0),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'invariant', 'A run identifier maps to one immutable context; a retry verifies identical bytes and conflicting bytes fail closed.', 0),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'invariant', 'The returned reference carries schema, plan identity, and SHA-256 without embedding context or credential values.', 1),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'transition', 'A complete context is serialized once beneath the configured artifact root and then addressed by a parsed file reference.', 0),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'consumer', 'IDbtRunExecutionContextWriter composition', 0),
  ('SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'non_goal', 'Build a dbt project bundle, resolve credentials, or dispatch a run.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  ('OBS-DBT-RUN-CONTEXT-WRITE-OUTCOME', 'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES', 'Typed unavailable, unsupported, immutable-conflict, and success outcomes remain visible at StartRun admission.', 'log', true, 'implemented'),
  ('OBS-DBT-PROJECT-BUNDLE-OUTCOME', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'Typed storage, project, safety, and revision outcomes remain visible at StartRun admission.', 'log', true, 'implemented')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
