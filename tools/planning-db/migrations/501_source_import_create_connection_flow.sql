-- DB-first completion for the SourceImportDialog CreateWarehouseConnection UX.
-- The command rail already exists in the canonical catalog; this migration
-- records the web dialog surface that now exercises it through the existing
-- IWarehouseSourceImportPort without storing raw credentials in the browser.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.SourceImportDialog',
  'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
  'component',
  'WarehouseConnectionCreateForm',
  jsonb_build_object(
    'role', 'controlled presentation form',
    'rail', 'CreateWarehouseConnection',
    'credentialPosture', 'credentialRef only; no raw secret capture',
    'composedBy', 'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx'
  ),
  'tools/planning-db/migrations/501_source_import_create_connection_flow.sql',
  md5('SourceImportDialog:WarehouseConnectionCreateForm:501')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.SourceImportDialog',
  'CreateWarehouseConnection',
  'command',
  'implemented-ui',
  jsonb_build_object(
    'purpose', 'Register a governed warehouse connection from the Add Source dialog before browsing source tables.',
    'owner', 'Warehouse connection aggregate',
    'port', 'IWarehouseSourceImportPort.createWarehouseConnection',
    'adapterSurface', 'POST /workspace/warehouse/connections',
    'negativeTests', jsonb_build_array('missing required command fields do not invoke the port')
  ),
  'tools/planning-db/migrations/501_source_import_create_connection_flow.sql',
  md5('SourceImportDialog:CreateWarehouseConnection:501')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'EV-SOURCE-IMPORT-CREATE-CONNECTION-PRESENTATION',
  'web.component.canvas.SourceImportDialog',
  'presentation-test',
  'apps/web/src/app/components/SourceImportWizard.test.tsx',
  'current',
  jsonb_build_object(
    'rail', 'CreateWarehouseConnection',
    'tests', jsonb_build_array(
      'creates a governed warehouse connection before browsing source tables',
      'does not create a warehouse connection when required command fields are missing'
    ),
    'proves', 'The Add Source dialog can create and select a governed warehouse connection through the existing port, and invalid command input fails closed before port invocation.'
  ),
  'tools/planning-db/migrations/501_source_import_create_connection_flow.sql',
  md5('EV-SOURCE-IMPORT-CREATE-CONNECTION-PRESENTATION:501')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection',
  'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1',
  'implemented',
  'CreateWarehouseConnection',
  'createwarehouseconnection',
  'command',
  'Warehouse connection aggregate',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx#WarehouseConnectionCreateForm',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx#ConnectionStep',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx#WizardStepContent',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx#createSourceImportWizardHarness',
    'apps/web/src/app/components/SourceImportWizard.test.tsx#SourceImportWizard'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'tools/planning-db/migrations/501_source_import_create_connection_flow.sql'
  ),
  jsonb_build_array(
    'planning-db:component/web.component.canvas.SourceImportDialog',
    'planning-db:rail/CreateWarehouseConnection'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/dvt-web-current-state-report.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'tools/planning-db/migrations/501_source_import_create_connection_flow.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'node --test --test-name-pattern "source import create connection flow" scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.test.tsx',
      'node --test --test-name-pattern "source import create connection flow" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:migrate',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining',
    true
  ),
  'tools/planning-db/migrations/501_source_import_create_connection_flow.sql',
  md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:CreateWarehouseConnection:501'),
  jsonb_build_object(
    'purpose', 'Exercise the existing CreateWarehouseConnection command from the SourceImportDialog connection step.',
    'owner', 'Warehouse connection aggregate',
    'component', 'web.component.canvas.SourceImportDialog',
    'port', 'IWarehouseSourceImportPort.createWarehouseConnection',
    'adapterSurface', 'POST /workspace/warehouse/connections'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Expose the existing CreateWarehouseConnection rail in the Add Source connection step, keeping credentials as credentialRef values and selecting the created connection for source discovery.',
    'componentGuides', jsonb_build_array('web.component.canvas.SourceImportDialog'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/dvt-web-current-state-report.md'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'CreateWarehouseConnection',
        'type', 'command',
        'dddOwner', 'Warehouse connection aggregate',
        'applicationPort', 'IWarehouseSourceImportPort.createWarehouseConnection',
        'adapterSurface', 'POST /workspace/warehouse/connections',
        'scopeAndAuthorization', 'workspace:source-connection:create, tenant/project/environment scope',
        'negativeTests', jsonb_build_array(
          'missing required command fields do not invoke the port'
        )
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
      'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
      'apps/web/src/app/components/sourceImportWizard/types.ts',
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
      'apps/web/src/app/components/SourceImportWizard.test.tsx',
      'tools/planning-db/migrations/501_source_import_create_connection_flow.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/api/**#new_connection_semantics',
      'apps/web/**#raw_secret_capture',
      'apps/web/cypress/e2e/canvas/**#fake_create_connection_success'
    ),
    'domainObjects', jsonb_build_array(
      'WarehouseConnection',
      'CreateWarehouseConnectionInput',
      'SourceImportWizardState'
    ),
    'fowlerSignals', jsonb_build_array(
      'boundary_drift_removed',
      'application_port_invocation',
      'presentation_component',
      'fail_closed_validation',
      'no_fake_adapter'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-CREATE-CONNECTION-PRESENTATION-001',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.test.tsx',
        'expectedFailure', 'EXPECTED_BUTTON:New connection',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
          'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
          'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'WarehouseConnectionCreateForm',
        'path', 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'useSourceImportWizard',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection', 'ImportWarehouseSources', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('application_presenter', 'state_coordinator', 'fail_closed_validation'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'ConnectionStep',
        'path', 'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection', 'TestWarehouseConnection', 'ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('presentation_composition', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    )
  ),
  1,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
