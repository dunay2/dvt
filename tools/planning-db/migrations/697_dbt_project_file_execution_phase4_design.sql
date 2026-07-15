-- Govern file-authoritative dbt Preview and Run before implementation. Product
-- commands remain PreviewExecutionPlan and StartRun; revision binding, target
-- resolution, source snapshotting, and bundle construction are internal
-- collaborators and must not become parallel command/query rails.

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
  'DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715',
  'E-DBT-PROJECT-ROUNDTRIP-P4-RUN',
  'File-authoritative dbt Preview and Run',
  'dbt Project Authoring / Canvas Execution',
  'approved',
  'Reuse the canonical planner and run rails while binding every Preview and StartRun to one analyzed project root, immutable content revision, server-owned target identity, and secret-free runtime bundle. File-backed execution must never regenerate dbt project files or fall back to graph-draft authority.',
  'hidden_authority',
  'BuildDbtPlannerGraphSource;PreviewExecutionPlan;ObservePlanRunReadiness;StartRun',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'decision', 'ADR-0060', 'must_prove', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'query', 'ProjectDbtGraphFromFiles', 'may_reference', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'query', 'BuildDbtPlannerGraphSource', 'may_reference', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'query', 'ObservePlanRunReadiness', 'may_reference', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'flow', 'PreviewExecutionPlan', 'may_update', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'flow', 'StartRun', 'may_update', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'contract', 'PlanPreviewProvenance.v1', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'test', 'RT-006', 'must_prove', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'path', 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md', 'may_reference', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'Plan preview provenance contract', 'module', 'contracts', 'Planner Contracts', 'packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts', 'PlanPreviewProvenance.v1', 'shared', 'critical', 'proposed', 'SYS-CONTRACTS-ROOT'),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'Canvas dbt file execution coordinator', 'service', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts', 'dbt_project_file_preview execution strategy', 'browser', 'critical', 'proposed', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'dbt execution target policy port', 'port', 'application', 'dbt Runtime Admission', 'apps/api/src/application/ports/dbtExecutionTarget.ts', 'IDbtExecutionTargetResolver', 'node', 'critical', 'proposed', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'Configured dbt execution target adapter', 'adapter', 'adapter', 'dbt Runtime Admission', 'apps/api/src/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.ts', 'IDbtExecutionTargetResolver', 'node', 'critical', 'proposed', 'SYS-API-INFRASTRUCTURE'),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'dbt run execution-context binding', 'service', 'application', 'StartRun', 'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts', 'IStartRunUseCase', 'node', 'critical', 'proposed', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'Immutable dbt project source snapshot', 'module', 'adapter', 'dbt Project Files', 'apps/api/src/infrastructure/dbt/dbtProjectSourceSnapshot.ts', 'DbtProjectSourceSnapshot', 'node', 'critical', 'proposed', 'SYS-API-INFRASTRUCTURE'),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'dbt project runtime bundle builder', 'adapter', 'adapter', 'dbt Runtime Admission', 'apps/api/src/infrastructure/dbt/DbtProjectBundleBuilder.ts', 'IDbtProjectBundleBuilder', 'node', 'critical', 'proposed', 'SYS-API-INFRASTRUCTURE')
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

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', repeat(md5('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE:697'), 2), 0, 'Plan preview provenance contract', 'component', 'SYS-CONTRACTS-ROOT', 'SYS-DVT', 'SYS-CONTRACTS', 'review', false, 'Define a discriminated, secret-free provenance envelope for transformation and file-authoritative dbt plan previews.', 'PlanPreviewProvenance.v1', '', 'codex'),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', repeat(md5('SYS-WEB-CANVAS-DBT-FILE-EXECUTION:697'), 2), 0, 'Canvas dbt file execution coordinator', 'component', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Translate one file projection into planner Preview, readiness, and StartRun without generating workspace files.', 'DbtProjectFileExecutionStrategy', 'BuildDbtPlannerGraphSource;PreviewExecutionPlan;ObservePlanRunReadiness;StartRun', 'codex'),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', repeat(md5('SYS-API-APPLICATION-DBT-EXECUTION-TARGET:697'), 2), 0, 'dbt execution target policy port', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Expose one complete server-owned dbt adapter, target-name, and credential-reference identity without credential material.', 'IDbtExecutionTargetResolver', 'ProjectDbtGraphFromFiles;StartRun', 'codex'),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', repeat(md5('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG:697'), 2), 0, 'Configured dbt execution target adapter', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Resolve and validate the all-or-none server configuration that implements IDbtExecutionTargetResolver.', 'IDbtExecutionTargetResolver', '', 'codex'),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', repeat(md5('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING:697'), 2), 0, 'dbt run execution-context binding', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Validate persisted file provenance and bind a revision-matched dbt bundle and target profile into StartRun.', 'DbtRunExecutionContextBindingUseCase', 'StartRun', 'codex'),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', repeat(md5('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT:697'), 2), 0, 'Immutable dbt project source snapshot', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Select allowed dbt project sources once, reject links and limits, and compute one deterministic content revision over the exact copied bytes.', 'DbtProjectSourceSnapshot', 'ProjectDbtGraphFromFiles;StartRun', 'codex'),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', repeat(md5('SYS-API-INFRA-DBT-PROJECT-BUNDLE:697'), 2), 0, 'dbt project runtime bundle builder', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Build a deterministic runtime bundle from one immutable source snapshot only after its revision matches preview provenance.', 'IDbtProjectBundleBuilder', 'StartRun', 'codex')
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

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change, ddd_owner, status
)
values
  ('RESP-PLAN-PREVIEW-PROVENANCE', 'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'Validate one discriminated preview provenance envelope and reject secret-bearing or cross-authority shapes.', 'The cross-boundary preview provenance vocabulary or compatibility policy changes.', 'PlanPreviewProvenance.v1', 'proposed'),
  ('RESP-WEB-DBT-FILE-EXECUTION', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'Coordinate planner projection, Preview, readiness, and StartRun for file authority without regenerating files.', 'The file-backed Canvas execution interaction or planner request mapping changes.', 'DbtProjectFileExecutionStrategy', 'proposed'),
  ('RESP-DBT-EXECUTION-TARGET-PORT', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'Define the server-owned dbt execution target identity required by projection and run admission.', 'The application-level target identity or fail-closed availability rule changes.', 'IDbtExecutionTargetResolver', 'proposed'),
  ('RESP-DBT-EXECUTION-TARGET-CONFIG', 'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'Adapt validated process configuration to IDbtExecutionTargetResolver without exposing secret material.', 'The deployment configuration source or parsing rules change.', 'IDbtExecutionTargetResolver', 'proposed'),
  ('RESP-DBT-RUN-CONTEXT-BINDING', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'Admit one persisted dbt plan into StartRun only when its project revision and target identity remain current.', 'dbt-specific StartRun admission or execution-context binding changes.', 'DbtRunExecutionContextBindingUseCase', 'proposed'),
  ('RESP-DBT-PROJECT-SNAPSHOT', 'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'Create one immutable allowed-source snapshot and deterministic content revision.', 'dbt source selection, secret exclusion, traversal limits, or revision semantics change.', 'DbtProjectSourceSnapshot', 'proposed'),
  ('RESP-DBT-PROJECT-BUNDLE', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'Package one already-validated immutable dbt source snapshot for runtime transport.', 'Runtime bundle format, compression, or transport limits change.', 'IDbtProjectBundleBuilder', 'proposed')
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id, contract_kind, owner_component_id, contract_ref,
  compatibility, status, validation_command
)
values (
  'CONTRACT-PLAN-PREVIEW-PROVENANCE-V1',
  'type',
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts',
  'additive',
  'proposed',
  'pnpm --filter @dvt/contracts test -- plan-preview-provenance'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values
  ('PORT-DBT-EXECUTION-TARGET-OUT', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'resolveExecutionTarget', 'query', 'outbound', null, null, array['missing fields fail closed', 'credential values never cross the port'], 'proposed'),
  ('PORT-DBT-PROJECT-BUNDLE-OUT', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'buildRevisionBoundBundle', 'storage', 'outbound', 'CONTRACT-PLAN-PREVIEW-PROVENANCE-V1', null, array['revision mismatch rejects StartRun', 'profiles and secrets are excluded'], 'proposed')
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  ('REL-WEB-DBT-FILE-EXECUTION-USES-PROJECTION', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'reads', 'outbound', 'sync', null, 'Invalid or stale projection keeps Preview and Run blocked.', 'workspace:graph-draft:view', jsonb_build_array('ProjectDbtGraphFromFiles'), 'proposed'),
  ('REL-WEB-DBT-FILE-EXECUTION-USES-PROVENANCE', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'depends_on', 'outbound', 'sync', 'CONTRACT-PLAN-PREVIEW-PROVENANCE-V1', 'Preview cannot be submitted without revision and target identity.', 'workspace:graph-draft:preview', jsonb_build_array('PreviewExecutionPlan'), 'proposed'),
  ('REL-DBT-TARGET-CONFIG-IMPLEMENTS-PORT', 'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'implements_port', 'inbound', 'sync', null, 'Incomplete server target configuration remains unavailable.', 'server configuration', jsonb_build_array('IDbtExecutionTargetResolver'), 'proposed'),
  ('REL-DBT-RUN-BINDING-READS-TARGET', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'reads', 'outbound', 'sync', null, 'Target drift rejects StartRun before dispatch.', 'workspace:run:start', jsonb_build_array('StartRun'), 'proposed'),
  ('REL-DBT-RUN-BINDING-CALLS-BUNDLE', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'calls', 'outbound', 'async', 'CONTRACT-PLAN-PREVIEW-PROVENANCE-V1', 'Revision mismatch or unsafe content rejects StartRun.', 'workspace:run:start', jsonb_build_array('StartRun'), 'proposed'),
  ('REL-DBT-BUNDLE-USES-SNAPSHOT', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'depends_on', 'outbound', 'async', null, 'Bundle creation never rereads a mutable project tree.', 'authorized project root', jsonb_build_array('DbtProjectSourceSnapshot'), 'proposed'),
  ('REL-DBT-ANALYZER-USES-SNAPSHOT', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'depends_on', 'outbound', 'async', null, 'Analysis and runtime bundle would hash different source sets.', 'authorized project root', jsonb_build_array('ProjectDbtGraphFromFiles'), 'proposed')
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
  ('TEST-PLAN-PREVIEW-PROVENANCE-V1', 'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'packages/@dvt/contracts/test/plan-preview-provenance.contract.test.ts', 'contract', 'negative', true, 'pnpm --filter @dvt/contracts test -- plan-preview-provenance'),
  ('TEST-WEB-DBT-FILE-EXECUTION', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test -- dbtProjectFileExecutionStrategy'),
  ('TEST-DBT-EXECUTION-TARGET-CONFIG', 'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts', 'unit', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts'),
  ('TEST-DBT-RUN-CONTEXT-BINDING-PHASE4', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts', 'unit', 'boundary', true, 'pnpm --filter dvt-api exec vitest run test/application/services/DbtRunExecutionContextBindingUseCase.test.ts'),
  ('TEST-DBT-PROJECT-SNAPSHOT', 'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'apps/api/test/infrastructure/dbt/dbtProjectSourceSnapshot.test.ts', 'property', 'boundary', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/dbtProjectSourceSnapshot.test.ts'),
  ('TEST-DBT-PROJECT-BUNDLE', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts', 'integration', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts'),
  ('TEST-DBT-PROJECT-ROUNDTRIP-RT006', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'e2e', 'flow', true, 'pnpm --filter @dvt/web cypress:run --spec cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts')
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
  'SYS-API-INFRA-DBT-PROJECT-BUNDLE'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'owns', 'packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts', 0),
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'owns', 'packages/@dvt/contracts/test/plan-preview-provenance.contract.test.ts', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'owns', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 2),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'owns', 'apps/api/src/application/ports/dbtExecutionTarget.ts', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'owns', 'apps/api/src/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.ts', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'owns', 'apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts', 1),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'owns', 'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'owns', 'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts', 1),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'owns', 'apps/api/src/infrastructure/dbt/dbtProjectSourceSnapshot.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'owns', 'apps/api/test/infrastructure/dbt/dbtProjectSourceSnapshot.test.ts', 1),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'owns', 'apps/api/src/application/ports/dbtProjectBundle.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'owns', 'apps/api/src/infrastructure/dbt/DbtProjectBundleBuilder.ts', 1),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'owns', 'apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts', 2)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
  'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
  'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
  'SYS-API-INFRA-DBT-PROJECT-BUNDLE'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'invariant', 'dbt file provenance names project root, revision SHA-256, analysis SHA-256, dbt version, selected unique IDs, provider, adapter, target name, and credential-reference identity.', 0),
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'invariant', 'No credential value, profile content, token, password, or environment value is representable in provenance.', 1),
  ('SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'non_goal', 'Persist generated dbt artifacts or runtime bundle bytes.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'invariant', 'Preview maps the current ProjectDbtGraphFromFiles projection to BuildDbtPlannerGraphSource and never calls GenerateDbtWorkspaceArtifacts.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'invariant', 'Any project revision, analysis, selection, or execution-target identity change makes the prior preview stale.', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'non_goal', 'Mutate dbt project files, graph-draft state, or server target configuration.', 0),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'invariant', 'The target is available only when adapter, target name, and credential-reference identity are all present and valid.', 0),
  ('SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'non_goal', 'Read credential values or create a product query rail.', 0),
  ('SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'invariant', 'Configuration parsing is all-or-none and returns identities only.', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'invariant', 'StartRun rejects stale project revision, stale target identity, missing dbt capability, and any secret-bearing project profile.', 0),
  ('SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'non_goal', 'Traverse files, build archives, parse dbt manifests, or choose deployment adapters.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'invariant', 'Analysis and runtime bundling consume the same allowed source-set policy and exact copied bytes.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'invariant', 'profiles.yml, credentials, generated output, VCS metadata, dependencies outside the configured dbt package directory, links, and editor temporaries are excluded or rejected.', 1),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'invariant', 'The bundle is built from one immutable snapshot only after contentSetSha256 equals preview provenance.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'non_goal', 'Resolve workspace authorization, execution target policy, or product command admission.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

-- Phase 2 prohibited Preview and Run while the projection was intentionally
-- read-only. Phase 4 keeps semantic graph mutation prohibited but makes the
-- analyzed file projection executable through the canonical rails.
delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
  and item_kind = 'invariant'
  and item_value = 'File-backed Canvas exposes no source import, graph mutation, Preview, Run, or graph-draft request.';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
  and item_kind = 'invariant'
  and item_value = 'File-backed Canvas exposes no source import, graph mutation, Preview, Run, or graph-draft request.';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE', 'invariant', 'File authority prohibits semantic graph mutation and graph-draft fallback while allowing revision-bound Preview and Run through its execution child.', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'File authority prohibits semantic graph mutation and graph-draft fallback while allowing revision-bound Preview and Run through its execution child.', 1)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, source_path,
  source_content_sha256, raw_component
)
select
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'Canvas dbt file execution coordinator',
  'state-view',
  'planned',
  'create',
  frontend_owner,
  'Coordinate the existing planner Preview, readiness, and StartRun rails from one current file projection without regeneration.',
  package_name,
  route_scope,
  plugin_scope,
  jsonb_build_array('RT-006 demanding-user proof is required before current status'),
  '[]'::jsonb,
  'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql',
  md5('frontend:dbt-file-execution:planned:697'),
  jsonb_build_object(
    'componentFamily', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'phase', 4,
    'authority', 'dbt-project-files',
    'semanticMutation', false,
    'regeneratesProjectFiles', false,
    'implementationStatus', 'planned'
  )
from planning_query_store.frontend_component_effective_component_query
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts', 'model', 'buildDbtProjectFileExecutionStrategy', jsonb_build_object('phase', 4, 'status', 'planned', 'purpose', 'Pure mapping from projection and target identity to the existing Canvas execution strategy.'), 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', md5('file:dbtProjectFileExecutionStrategy:697')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 'test', null, jsonb_build_object('phase', 4, 'status', 'planned', 'purpose', 'Unit and negative evidence for no regeneration and stale-signature behavior.'), 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', md5('file:dbtProjectFileExecutionStrategy-test:697')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'e2e-test', null, jsonb_build_object('phase', 4, 'status', 'planned', 'purpose', 'RT-006 live browser proof with real API and runtime.', 'noIntercept', true), 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', md5('file:dbt-project-preview-run-live:697'));

delete from planning_query_store.frontend_component_local_cq_rails
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'BuildDbtPlannerGraphSource', 'query', 'gap-needed', jsonb_build_object('reuse', true, 'owner', 'PlannerGraphSource'), 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', md5('rail:web-dbt-file:BuildDbtPlannerGraphSource:697')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'PreviewExecutionPlan', 'command', 'gap-needed', jsonb_build_object('reuse', true, 'owner', 'ExecutionPlan'), 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', md5('rail:web-dbt-file:PreviewExecutionPlan:697')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'ObservePlanRunReadiness', 'query', 'gap-needed', jsonb_build_object('reuse', true, 'owner', 'PlanRunReadiness'), 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', md5('rail:web-dbt-file:ObservePlanRunReadiness:697')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'StartRun', 'command', 'gap-needed', jsonb_build_object('reuse', true, 'owner', 'Run'), 'tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql', md5('rail:web-dbt-file:StartRun:697'));
