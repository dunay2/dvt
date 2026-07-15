-- Close the protected browser import vertical and its crash-safe process.
-- No new product rail is introduced: ValidateDbtProjectImport and
-- ImportDbtProject remain the only externally observable intents.

update architecture.design
set
  status = 'implemented',
  rationale = case design_id
    when 'DBT-PROJECT-IMPORT-PHASE3-20260714' then
      'A protected browser flow validates project identity and inventory, explicitly confirms import, establishes file authority, projects the exact imported revision, and proves Source Import against the resulting Canvas without graph-draft fallback.'
    else
      'One durable leased PostgreSQL process now owns authority acquisition, completed replay, crash recovery, and compensation for ImportDbtProject.'
  end,
  updated_at = now()
where design_id in (
  'DBT-PROJECT-IMPORT-PHASE3-20260714',
  'DBT-PROJECT-IMPORT-PHASE3-RECOVERY-20260715'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'public_api', 'DbtProjectImportDialog', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'invariant', 'Composition obtains the protected port and never owns validation, transport, or presentation policy.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'transition', 'A closed dialog opens one isolated import interaction and closes only while no command is in flight.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'consumer', 'Canvas Workspace menu contribution', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'transition', 'A scoped request becomes a protected HTTP call and a contract-validated report or result.', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'consumer', 'useDbtProjectImportController', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'public_api', 'useDbtProjectImportController', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'consumer', 'DbtProjectImportDialog', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'public_api', 'DbtProjectImportDialogView;buildDbtProjectImportPresentationModel', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'transition', 'Typed interaction state projects to stable status, inventory, diagnostics, affordances, and server receipt.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'consumer', 'DbtProjectImportDialog', 0),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'public_api', 'createBrowserIdempotencyKey', 0),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'transition', 'A command namespace becomes one opaque cryptographically random browser identity.', 0),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'consumer', 'dbt project import and Source Import command models', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'consumer', 'ImportDbtProjectUseCase', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:692'), 2),
  status = 'canonical',
  revision = revision + 1
where component_id in (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
  'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS'
);

update architecture.component
set
  status = 'implemented',
  repo_path = case component_id
    when 'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS'
      then 'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
  'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS'
);

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
  'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-WEB-DBT-IMPORT-CONTAINS-GATEWAY',
  'REL-WEB-DBT-IMPORT-CONTAINS-CONTROLLER',
  'REL-WEB-DBT-IMPORT-CONTAINS-PRESENTATION',
  'REL-WEB-DBT-IMPORT-CONTROLLER-CALLS-GATEWAY',
  'REL-WEB-DBT-IMPORT-PRESENTATION-CONSUMES-CONTROLLER',
  'REL-WEB-DBT-IMPORT-GATEWAY-CALLS-API',
  'REL-WEB-DBT-IMPORT-USES-BROWSER-IDEMPOTENCY',
  'REL-WEB-SOURCE-IMPORT-USES-BROWSER-IDEMPOTENCY',
  'REL-DBT-IMPORT-OWNS-DURABLE-PROCESS',
  'REL-DBT-IMPORT-PROCESS-COORDINATES-AUTHORITY'
);

-- Presentation projection belongs to the presentation component, not to the
-- interaction controller. This is the single ownership correction from the
-- design migration after inspecting the implemented files.
delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
  'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts', 2),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/ports/dbtProjectImport.ts', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts', 1),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.test.ts', 2),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'owns', 'apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'owns', 'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.ts', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'owns', 'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.test.ts', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx', 2),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx', 3),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'owns', 'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts', 0),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'owns', 'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.test.ts', 1),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'owns', 'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'owns', 'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts', 1),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'owns', 'apps/api/test/application/dbtProjectImportProcessRecovery.test.ts', 2)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

-- DVT-managed workspace metadata is physically and semantically separate
-- from project-authoritative workspace files. The adapter reuses the bounded
-- file repository but owns only the .dvt namespace boundary.
insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-API-INFRA-WORKSPACE-METADATA-FILES',
  'Workspace metadata file repository',
  'adapter',
  'adapter',
  'Workspace Files',
  'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts',
  'IWorkspaceMetadataFileRepository',
  'node',
  'high',
  'implemented',
  'SYS-API-INFRA-WORKSPACE-FILES'
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

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-API-INFRA-WORKSPACE-METADATA-FILES',
  'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql',
  repeat(md5('SYS-API-INFRA-WORKSPACE-METADATA-FILES:692'), 2),
  0,
  'Workspace metadata file repository',
  'component',
  'SYS-API-INFRA-WORKSPACE-FILES',
  'SYS-DVT',
  'SYS-API-ROOT',
  'review',
  false,
  'Isolate server-managed .dvt metadata from project-authoritative workspace files while preserving workspace scope and compare-and-swap writes.',
  'IWorkspaceMetadataFileRepository',
  '',
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
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'public_api', 'IWorkspaceMetadataFileRepository.getFileContent;IWorkspaceMetadataFileRepository.saveFileContent', 0),
  ('SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'invariant', 'Only .dvt paths enter the managed metadata repository and they resolve outside project-authoritative workspace files.', 0),
  ('SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'transition', 'A validated .dvt path becomes one scope-isolated metadata read or compare-and-swap write.', 0),
  ('SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'consumer', 'WorkspaceWarehouseConnectionCatalog', 0),
  ('SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'non_goal', 'Expose server-managed metadata through project file list, read, import, or runtime bundle rails.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set status = 'canonical', revision = revision + 1
where component_id = 'SYS-API-INFRA-WORKSPACE-METADATA-FILES';

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change, ddd_owner, status
)
values (
  'RESP-WORKSPACE-METADATA-FILE-REPOSITORY',
  'SYS-API-INFRA-WORKSPACE-METADATA-FILES',
  'Map server-managed .dvt paths to a scope-isolated metadata root without exposing that namespace through project file rails.',
  'The managed metadata namespace, size bound, or storage partition policy changes.',
  'IWorkspaceMetadataFileRepository',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'owns', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts', 0),
  ('SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'owns', 'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-WORKSPACE-FILES-CONTAINS-METADATA-REPOSITORY',
    'SYS-API-INFRA-WORKSPACE-FILES',
    'SYS-API-INFRA-WORKSPACE-METADATA-FILES',
    'contains',
    'outbound',
    'sync',
    'DVT-managed metadata is stored among project-authoritative files.',
    'tenant/project/environment',
    jsonb_build_array('apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts'),
    'implemented'
  ),
  (
    'REL-WAREHOUSE-CATALOG-USES-WORKSPACE-METADATA',
    'SYS-API-INFRA-WAREHOUSE-SOURCES',
    'SYS-API-INFRA-WORKSPACE-METADATA-FILES',
    'depends_on',
    'outbound',
    'sync',
    'Warehouse connection metadata pollutes imported dbt project authority.',
    'tenant/project/environment',
    jsonb_build_array(
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts'
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
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  ('TEST-WEB-DBT-PROJECT-IMPORT-COMPOSITION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx', 'integration', 'flow', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx'),
  ('TEST-WEB-DBT-PROJECT-IMPORT-LIVE', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts', 'e2e', 'flow', true, 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'),
  ('TEST-WORKSPACE-METADATA-FILE-REPOSITORY', 'SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.test.ts', 'integration', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  ('OBS-DBT-PROJECT-IMPORT-PROCESS-OUTCOME', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'Typed in-progress, recovered, failed, mismatched, and completed outcomes remain visible at the ImportDbtProject command boundary.', 'log', true, 'implemented'),
  ('OBS-WORKSPACE-METADATA-FILE-FAILURE', 'SYS-API-INFRA-WORKSPACE-METADATA-FILES', 'Invalid namespace, revision conflict, and storage failures propagate to the owning protected command.', 'log', true, 'implemented')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

-- Only the visual template is a frontend UX component. Composition,
-- controller, gateway, and persistence remain architecture components.
insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, source_path,
  source_content_sha256, raw_component
)
values (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
  'dbt project import presentation',
  'modal',
  'current',
  'create',
  'Frontend / Canvas',
  'Render the typed import state, inventory, diagnostics, and explicit confirmation without transport or authority policy.',
  '@dvt/web',
  '/canvas',
  'dbt',
  '[]'::jsonb,
  jsonb_build_array(
    'EV-WEB-DBT-PROJECT-IMPORT-PRESENTATION',
    'EV-WEB-DBT-PROJECT-IMPORT-LIVE'
  ),
  'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql',
  md5('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION:current:692'),
  jsonb_build_object(
    'implementationStatus', 'current',
    'phase', 3,
    'presentationOnly', true,
    'semanticAuthority', false
  )
)
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
where component_id = 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.ts', 'presentation-model', 'buildDbtProjectImportPresentationModel', jsonb_build_object('pure', true), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('file:dbt-import-presentation-model:692')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.test.ts', 'unit-test', null, jsonb_build_object('scope', 'state projection and command affordances'), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('file:dbt-import-presentation-model-test:692')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx', 'presentation-template', 'DbtProjectImportDialogView', jsonb_build_object('transportFree', true), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('file:dbt-import-view:692')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx', 'presentation-test', null, jsonb_build_object('scope', 'inventory, diagnostics, receipt, and delegated commands'), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('file:dbt-import-view-test:692'));

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'ValidateDbtProjectImport', 'query', 'implemented-ui', jsonb_build_object('invocationOwnedBy', 'DbtProjectImportInteraction'), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('rail:dbt-import-presentation-validate:692')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'ImportDbtProject', 'command', 'implemented-ui', jsonb_build_object('invocationOwnedBy', 'DbtProjectImportInteraction'), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('rail:dbt-import-presentation-command:692'))
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id, component_id, evidence_kind, evidence_ref, evidence_status,
  raw_evidence, source_path, source_content_sha256
)
values
  ('EV-WEB-DBT-PROJECT-IMPORT-PRESENTATION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'presentation-test', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx', 'passing', jsonb_build_object('inventory', true, 'diagnostics', true, 'receiptOnlySuccess', true), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('evidence:dbt-import-presentation:692')),
  ('EV-WEB-DBT-PROJECT-IMPORT-LIVE', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'e2e-test', 'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts', 'passing', jsonb_build_object('result', '1 passing', 'noIntercept', true, 'noGraphDraft', true, 'realAdapters', jsonb_build_array('protected API', 'PostgreSQL', 'dbt CLI', 'scoped workspace files')), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('evidence:dbt-import-live:692'))
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'EV-WEB-DBT-PROJECT-IMPORT-PRESENTATION', 'unit-test', 'current', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx', 'ValidateDbtProjectImport', 'dbt-project-import-dialog', 'The template presents complete validated inventory and diagnostics and delegates commands without transport or synthesized success.', jsonb_build_object('presentationOnly', true), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('validation:dbt-import-presentation:692')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'EV-WEB-DBT-PROJECT-IMPORT-LIVE', 'e2e-test', 'current', 'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts', 'ImportDbtProject', 'dbt-project-import-source-live', 'A demanding user imports a real protected dbt project, lands on exact file authority, and imports a warehouse source without graph-draft fallback or HTTP interception.', jsonb_build_object('noIntercept', true, 'noFakeSuccess', true), 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql', md5('validation:dbt-import-live:692'))
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

-- Retire by deletion, not by a legacy status: the process store replaced the
-- receipt-only component and no active DB read model may reference it.
delete from architecture.component_observability
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from architecture.component_test
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from architecture.component_relation
where source_component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS'
   or target_component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from architecture.component_responsibility
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from planning_query_store.governance_component_local_definitions
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from architecture.design_scope
where subject_kind = 'component'
  and subject_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

delete from architecture.component
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

-- Reconcile the one canonical command rail with actual implementation files
-- and remove references to the deleted receipt-only adapter.
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = (
    select jsonb_agg(item order by item #>> '{}')
    from (
      select distinct item
      from jsonb_array_elements(
        coalesce(rail.implementation_refs, '[]'::jsonb) || jsonb_build_array(
          'apps/api/src/application/ports/dbtProjectImport.ts',
          'apps/api/src/application/services/importDbtProjectUseCase.ts',
          'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts',
          'apps/api/test/application/dbtProjectImportProcessRecovery.test.ts',
          'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts',
          'apps/web/src/app/ports/dbtProjectImport.ts',
          'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts',
          'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx',
          'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
          'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql'
        )
      ) refs(item)
      where item #>> '{}' not in (
        'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts',
        'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts'
      )
    ) distinct_refs
  ),
  architecture_guards = coalesce(rail.architecture_guards, '[]'::jsonb) || jsonb_build_array(
    'The browser presents import completion only from the protected typed receipt and then routes to the exact persisted file authority.',
    'The receipt-only persistence adapter is absent; one durable leased process owns authority and replay.'
  ),
  completion_gate = coalesce(rail.completion_gate, '[]'::jsonb) || jsonb_build_array(
    'Strict Cypress proves validation, import, exact authority routing, projection refresh, and Source Import without cy.intercept or graph-draft fallback.'
  ),
  source_path = 'tools/planning-db/migrations/692_dbt_project_import_phase3_web_closeout.sql',
  source_content_sha256 = repeat(md5('ImportDbtProject:phase3-closeout:692'), 2),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_name = 'ImportDbtProject';

do $$
declare
  import_rail_count integer;
  old_component_count integer;
begin
  select count(*) into import_rail_count
  from planning_query_store.command_query_rail_query
  where rail_name = 'ImportDbtProject';

  if import_rail_count <> 1 then
    raise exception 'ImportDbtProject requires one canonical rail, found %', import_rail_count;
  end if;

  select count(*) into old_component_count
  from architecture.component
  where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

  if old_component_count <> 0 then
    raise exception 'Receipt-only import component remains active';
  end if;
end $$;
