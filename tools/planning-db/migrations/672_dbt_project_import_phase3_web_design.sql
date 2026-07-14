-- Govern the phase-three browser boundary before implementation. The web
-- component is split by reason to change: protected transport, interaction
-- orchestration, and presentation. Existing product rails are reactivated
-- from their retired historical entries because the protected API now exists.

update planning_query_store.feature_mechanization_local_rails
set
  feature_id = 'E-DBT-PROJECT-ROUNDTRIP-1',
  mechanization_status = 'implemented',
  ddd_owner = case rail_name
    when 'ValidateDbtProjectImport' then 'DbtProjectImportValidationReport'
    else 'CanvasAuthoringAuthorityBinding'
  end,
  rail_status = 'implemented',
  symbol_refs = case rail_name
    when 'ValidateDbtProjectImport' then jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts#ValidateDbtProjectImportRequestSchema',
      'apps/api/src/application/services/validateDbtProjectImportUseCase.ts#ValidateDbtProjectImportUseCase',
      'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts#registerDbtProjectImportRoutes'
    )
    else jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts#DbtProjectImportCommandSchema',
      'apps/api/src/application/services/importDbtProjectUseCase.ts#ImportDbtProjectUseCase',
      'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts#registerDbtProjectImportRoutes'
    )
  end,
  implementation_refs = case rail_name
    when 'ValidateDbtProjectImport' then jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts',
      'apps/api/src/application/services/validateDbtProjectImportUseCase.ts',
      'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts',
      'apps/api/test/application/dbtProjectImportUseCases.test.ts',
      'apps/api/test/entrypoints/http/dbtProjectImportRoutes.test.ts'
    )
    else jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts',
      'apps/api/src/application/services/importDbtProjectUseCase.ts',
      'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts',
      'apps/api/test/application/dbtProjectImportUseCases.test.ts',
      'apps/api/test/entrypoints/http/dbtProjectImportRoutes.test.ts'
    )
  end,
  documentation_refs = jsonb_build_array(
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/dbt-project/**',
    'apps/api/src/application/services/*DbtProjectImportUseCase.ts',
    'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts',
    'apps/web/src/app/ports/dbtProjectImport.ts',
    'apps/web/src/app/services/dbtProject/**',
    'apps/web/src/app/components/dbtProjectImport/**',
    'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'
  ),
  architecture_guards = jsonb_build_array(
    'Validation is read-only and import is an explicit command.',
    'The browser consumes typed contracts and cannot establish semantic authority.',
    'Import success is presented only from the protected command receipt.'
  ),
  completion_gate = jsonb_build_array(
    'Contract, API, browser adapter, presentation, and strict Cypress evidence pass.',
    'No graph-draft fallback, URL project-root authority, stub, or fake success remains.'
  ),
  source_path = 'tools/planning-db/migrations/672_dbt_project_import_phase3_web_design.sql',
  source_content_sha256 = repeat(md5(rail_name || ':phase3-web-design:672'), 2),
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'status', 'implemented',
    'reintroducedBy', 'real protected phase-three API'
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'featureId', 'E-DBT-PROJECT-ROUNDTRIP-1',
    'mechanizationStatus', 'implemented',
    'phase', 3
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id in (
  'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport',
  'local#frontend-gap-rail-reconciliation-20260619#command#importdbtproject'
);

update architecture.component
set
  name = 'Canvas dbt project import composition',
  kind = 'module',
  repo_path = 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx',
  public_contract = 'DbtProjectImportDialog',
  status = 'proposed',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT';

update architecture.component_responsibility
set
  responsibility = 'Compose the dbt project import gateway, controller, and presentation without owning their internal policy.',
  reason_to_change = 'The import interaction composition or child dependency wiring changes.',
  ddd_owner = 'DbtProjectImportDialog',
  status = 'proposed'
where responsibility_id = 'RESP-WEB-DBT-PROJECT-IMPORT';

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
  (
    'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
    'dbt project import browser gateway',
    'adapter',
    'adapter',
    'Frontend / Canvas',
    'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts',
    'IDbtProjectImportPort',
    'browser',
    'critical',
    'proposed',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT'
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
    'dbt project import interaction controller',
    'service',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts',
    'useDbtProjectImportController',
    'browser',
    'critical',
    'proposed',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT'
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
    'dbt project import presentation',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx',
    'DbtProjectImportDialogView',
    'browser',
    'high',
    'proposed',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT'
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
values
  (
    'RESP-WEB-DBT-PROJECT-IMPORT-GATEWAY',
    'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
    'Translate the two protected dbt import rails into validated browser DTOs.',
    'HTTP transport, contract parsing, workspace scope, or stable error translation changes.',
    'DbtProjectImportGateway',
    'proposed'
  ),
  (
    'RESP-WEB-DBT-PROJECT-IMPORT-CONTROLLER',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
    'Own validate-before-import state transitions and command idempotency for one dialog session.',
    'The import interaction state machine or command sequencing changes.',
    'DbtProjectImportInteraction',
    'proposed'
  ),
  (
    'RESP-WEB-DBT-PROJECT-IMPORT-PRESENTATION',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
    'Render project identity, inventory, diagnostics, and explicit confirmation from a presentation model.',
    'The dialog visual hierarchy, accessible interaction, or copy changes.',
    'DbtProjectImportPresentation',
    'proposed'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
  (
    'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
    'tools/planning-db/migrations/672_dbt_project_import_phase3_web_design.sql',
    repeat(md5('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT:672'), 2),
    0,
    'dbt project import browser gateway',
    'component',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Adapt ValidateDbtProjectImport and ImportDbtProject to typed protected browser calls.',
    'DbtProjectImportGateway',
    'ValidateDbtProjectImport;ImportDbtProject',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
    'tools/planning-db/migrations/672_dbt_project_import_phase3_web_design.sql',
    repeat(md5('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER:672'), 2),
    0,
    'dbt project import interaction controller',
    'component',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Coordinate validation, explicit confirmation, import, and receipt completion.',
    'DbtProjectImportInteraction',
    'ValidateDbtProjectImport;ImportDbtProject',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
    'tools/planning-db/migrations/672_dbt_project_import_phase3_web_design.sql',
    repeat(md5('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION:672'), 2),
    0,
    'dbt project import presentation',
    'component',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Render the import state and diagnostics without invoking transport or domain parsing.',
    'DbtProjectImportPresentation',
    'ValidateDbtProjectImport;ImportDbtProject',
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
  'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'owns', 'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts', 2),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/ports/dbtProjectImport.ts', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts', 1),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'owns', 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.test.ts', 2),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'owns', 'apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'owns', 'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.ts', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'owns', 'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.test.ts', 2),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'owns', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
  ('REL-WEB-DBT-IMPORT-CONTAINS-GATEWAY', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'contains', 'outbound', 'sync', 'The dialog bypasses its typed protected API gateway.', 'tenant/project/environment', jsonb_build_array('apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx'), 'proposed'),
  ('REL-WEB-DBT-IMPORT-CONTAINS-CONTROLLER', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'contains', 'outbound', 'sync', 'Transport or presentation owns interaction sequencing.', 'browser session', jsonb_build_array('apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx'), 'proposed'),
  ('REL-WEB-DBT-IMPORT-CONTAINS-PRESENTATION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'contains', 'outbound', 'sync', 'The composition renders ad hoc markup instead of the presentation template.', 'browser session', jsonb_build_array('apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx'), 'proposed'),
  ('REL-WEB-DBT-IMPORT-CONTROLLER-CALLS-GATEWAY', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'calls', 'outbound', 'async', 'Validation and import are reordered, duplicated, or parsed by the controller.', 'tenant/project/environment', jsonb_build_array('apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts'), 'proposed'),
  ('REL-WEB-DBT-IMPORT-PRESENTATION-CONSUMES-CONTROLLER', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'consumes', 'inbound', 'sync', 'Presentation invents domain state or executes a command.', 'browser session', jsonb_build_array('apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx'), 'proposed'),
  ('REL-WEB-DBT-IMPORT-GATEWAY-CALLS-API', 'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'calls', 'outbound', 'async', 'The browser uses an unprotected or parallel import route.', 'workspace:files:view;workspace:files:save', jsonb_build_array('apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts'), 'proposed')
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

delete from architecture.component_relation
where relation_id = 'REL-WEB-DBT-IMPORT-CALLS-API';

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
  ('TEST-WEB-DBT-PROJECT-IMPORT-GATEWAY', 'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web exec vitest run src/app/services/dbtProject/dbtProjectImport.api.test.ts'),
  ('TEST-WEB-DBT-PROJECT-IMPORT-CONTROLLER', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.test.ts'),
  ('TEST-WEB-DBT-PROJECT-IMPORT-PRESENTATION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'public_api', 'IDbtProjectImportPort.validateProject', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'public_api', 'IDbtProjectImportPort.importProject', 1),
  ('SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'invariant', 'Every response is parsed by the versioned contract before presentation.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'transition', 'idle -> validating -> accepted|rejected -> importing -> imported|failed', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'invariant', 'Changing project root or Canvas id invalidates accepted validation.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'invariant', 'Import is disabled until the current root has an accepted receipt.', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'invariant', 'Inventory counts, bytes, excluded files, adapter, and diagnostics remain visible before confirmation.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'non_goal', 'Parse dbt files, call HTTP, create Canvas authority, or synthesize success.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
