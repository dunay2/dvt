-- Govern phase three before implementation. This design activates the two
-- canonical dbt project import rails, reuses ImportWarehouseSources, and keeps
-- the batch file gateway internal to the application boundary.

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
  'DBT-PROJECT-IMPORT-PHASE3-20260714',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'dbt project import and authority-aware Source Import',
  'dbt Project Authoring / Canvas',
  'approved',
  'Phase three validates an existing scoped dbt project, persists one explicit Canvas authority, proves the first file projection, and branches the existing Source Import command without dual semantic writes.',
  'hidden_authority',
  'ValidateDbtProjectImport;ImportDbtProject;ImportWarehouseSources',
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
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'decision', 'ADR-0060', 'must_prove', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'query', 'ValidateDbtProjectImport', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'command', 'ImportDbtProject', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'command', 'ImportWarehouseSources', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'query', 'ProjectDbtGraphFromFiles', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'path', 'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md', 'may_create', true)
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
values
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'tools/planning-db/migrations/663_dbt_project_import_phase3_design.sql', repeat(md5('SYS-CONTRACTS-DBT-PROJECT-IMPORT:663'), 2), 0, 'dbt project import contract', 'component', 'SYS-CONTRACTS-ROOT', 'SYS-DVT', 'SYS-CONTRACTS', 'review', false, 'Version dbt project import validation reports, accepted receipts, commands, and receipts.', 'DbtProjectImportContract', 'ValidateDbtProjectImport;ImportDbtProject', 'codex'),
  ('SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'tools/planning-db/migrations/663_dbt_project_import_phase3_design.sql', repeat(md5('SYS-API-APPLICATION-DBT-PROJECT-IMPORT:663'), 2), 0, 'dbt project import application service', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Validate an existing scoped dbt project and explicitly bind an unoccupied Canvas to file authority.', 'DbtProjectImportApplicationService', 'ValidateDbtProjectImport;ImportDbtProject', 'codex'),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'tools/planning-db/migrations/663_dbt_project_import_phase3_design.sql', repeat(md5('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR:663'), 2), 0, 'dbt project import inspector', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Inspect one existing workspace dbt project under explicit file, path, secret, and size policy.', 'IDbtProjectImportInspectorPort', 'ValidateDbtProjectImport;ImportDbtProject', 'codex'),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'tools/planning-db/migrations/663_dbt_project_import_phase3_design.sql', repeat(md5('SYS-API-INFRA-CANVAS-AUTHORITY-STORE:663'), 2), 0, 'Canvas authoring authority store', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Persist and compare one scoped Canvas semantic authority binding and idempotency receipt.', 'ICanvasAuthoringAuthorityStore', 'ImportDbtProject;ProjectDbtGraphFromFiles;ImportWarehouseSources', 'codex'),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'tools/planning-db/migrations/663_dbt_project_import_phase3_design.sql', repeat(md5('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT:663'), 2), 0, 'Canvas dbt project import dialog', 'component', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Present project validation, diagnostics, explicit confirmation, and navigation from a real import receipt.', 'DbtProjectImportDialog', 'ValidateDbtProjectImport;ImportDbtProject', 'codex')
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-CONTRACTS-DBT-PROJECT-IMPORT',
  'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'owns', 'packages/@dvt/contracts/src/contracts/dbt-project/**', 0),
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'owns', 'packages/@dvt/contracts/test/dbt-project-import.contract.test.ts', 1),
  ('SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'owns', 'apps/api/src/application/ports/dbtProjectImport.ts', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'owns', 'apps/api/src/application/services/validateDbtProjectImportUseCase.ts', 1),
  ('SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'owns', 'apps/api/src/application/services/importDbtProjectUseCase.ts', 2),
  ('SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'owns', 'apps/api/test/application/dbtProjectImport*.test.ts', 3),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'owns', 'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'owns', 'apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'owns', 'apps/api/src/application/ports/canvasAuthoringAuthority.ts', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'owns', 'apps/api/src/infrastructure/canvasAuthoringAuthority/**', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'owns', 'apps/api/test/infrastructure/canvasAuthoringAuthority/**', 2),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/ports/dbtProjectImport.ts', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/components/dbtProjectImport/**', 2),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts', 3)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
values
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'dbt project import contract', 'module', 'contracts', 'dbt Project Authoring', 'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts', 'DbtProjectImport.v1', 'shared', 'critical', 'proposed', 'SYS-CONTRACTS-ROOT'),
  ('SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'dbt project import application service', 'service', 'application', 'dbt Project Authoring', 'apps/api/src/application/services/validateDbtProjectImportUseCase.ts', 'ValidateDbtProjectImport;ImportDbtProject', 'node', 'critical', 'proposed', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'dbt project import inspector', 'adapter', 'adapter', 'dbt Project Authoring', 'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts', 'IDbtProjectImportInspectorPort', 'node', 'critical', 'proposed', 'SYS-API-INFRASTRUCTURE'),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'Canvas authoring authority store', 'adapter', 'adapter', 'Canvas Authoring', 'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts', 'ICanvasAuthoringAuthorityStore', 'node', 'critical', 'proposed', 'SYS-API-INFRASTRUCTURE'),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'Canvas dbt project import dialog', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx', 'IDbtProjectImportPort', 'browser', 'critical', 'proposed', 'SYS-WEB-CANVAS-GRAPH-SURFACE')
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
values
  ('RESP-DBT-PROJECT-IMPORT-CONTRACT', 'SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'Version dbt project import validation and command transport contracts.', 'The cross-process import vocabulary or compatibility policy changes.', 'DbtProjectImportContract', 'proposed'),
  ('RESP-DBT-PROJECT-IMPORT-APPLICATION', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'Orchestrate validation and explicit file-authority binding.', 'Import policy or command/query orchestration changes.', 'DbtProjectImportApplicationService', 'proposed'),
  ('RESP-DBT-PROJECT-IMPORT-INSPECTOR', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'Inspect one scoped local project under compatibility and security limits.', 'Filesystem compatibility or import security changes.', 'IDbtProjectImportInspectorPort', 'proposed'),
  ('RESP-CANVAS-AUTHORITY-STORE', 'SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'Persist and compare one scoped Canvas authority binding.', 'Authority persistence, conflict, or idempotency semantics change.', 'ICanvasAuthoringAuthorityStore', 'proposed'),
  ('RESP-WEB-DBT-PROJECT-IMPORT', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'Present validation, diagnostics, confirmation, and import success.', 'The import interaction or presentation model changes.', 'DbtProjectImportDialog', 'proposed')
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
values
  ('REL-DBT-IMPORT-USES-IMPORT-CONTRACT', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'depends_on', 'outbound', 'sync', 'Application invents a parallel import vocabulary.', 'tenant/project/environment', jsonb_build_array('packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts'), 'proposed'),
  ('REL-DBT-IMPORT-USES-INSPECTOR', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'calls', 'outbound', 'async', 'Unsafe or incompatible project is accepted.', 'workspace:files:view', jsonb_build_array('apps/api/src/application/ports/dbtProjectImport.ts'), 'proposed'),
  ('REL-DBT-IMPORT-PERSISTS-AUTHORITY', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'calls', 'outbound', 'async', 'Success is returned without persisted authority.', 'workspace:files:save', jsonb_build_array('apps/api/src/application/ports/canvasAuthoringAuthority.ts'), 'proposed'),
  ('REL-DBT-PROJECT-GRAPH-RESOLVES-PERSISTED-AUTHORITY', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'calls', 'outbound', 'async', 'Client query parameters establish semantic authority.', 'workspace:graph-draft:view', jsonb_build_array('apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts'), 'proposed'),
  ('REL-SOURCE-IMPORT-RESOLVES-PERSISTED-AUTHORITY', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'calls', 'outbound', 'async', 'Source Import writes both semantic authorities.', 'workspace:source-import:import', jsonb_build_array('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'), 'proposed'),
  ('REL-SOURCE-IMPORT-USES-BATCH-FILE-MUTATION', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'calls', 'outbound', 'async', 'A multi-file source import publishes a partial YAML set.', 'workspace:source-import:import', jsonb_build_array('apps/api/src/application/ports/workspaceFiles.ts'), 'proposed'),
  ('REL-WEB-DBT-IMPORT-CALLS-API', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'calls', 'outbound', 'async', 'UI reports import success before the command receipt.', 'tenant/project/environment', jsonb_build_array('apps/web/src/app/ports/dbtProjectImport.ts'), 'proposed')
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
values
  ('TEST-DBT-PROJECT-IMPORT-CONTRACT', 'SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'packages/@dvt/contracts/test/dbt-project-import.contract.test.ts', 'contract', 'negative', true, 'pnpm --filter @dvt/contracts test -- dbt-project-import'),
  ('TEST-DBT-PROJECT-IMPORT-APPLICATION', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'apps/api/test/application/dbtProjectImportUseCases.test.ts', 'unit', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/application/dbtProjectImportUseCases.test.ts'),
  ('TEST-DBT-PROJECT-IMPORT-INSPECTOR', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts', 'integration', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts'),
  ('TEST-CANVAS-AUTHORITY-STORE', 'SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts', 'integration', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts'),
  ('TEST-WEB-DBT-PROJECT-IMPORT', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx'),
  ('TEST-DBT-PROJECT-IMPORT-SOURCE-LIVE', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts', 'e2e', 'boundary', true, 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
