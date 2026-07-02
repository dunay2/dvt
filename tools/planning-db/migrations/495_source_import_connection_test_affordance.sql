-- DB-first authority for exposing the existing TestWarehouseConnection command
-- from the Add Source Connections section.

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
  'local#E-CANVAS-ADD-SOURCE-CONNECTION-TEST-1#command#testwarehouseconnection',
  'E-CANVAS-ADD-SOURCE-CONNECTION-TEST-1',
  'implemented',
  'TestWarehouseConnection',
  'testwarehouseconnection',
  'command',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx#ConnectionStep',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx#WizardStepContent',
    'apps/web/src/app/components/SourceImportWizard.test.tsx#SourceImportWizard'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/495_source_import_connection_test_affordance.sql'
  ),
  jsonb_build_array('planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/495_source_import_connection_test_affordance.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining',
    true
  ),
  'tools/planning-db/migrations/495_source_import_connection_test_affordance.sql',
  md5('E-CANVAS-ADD-SOURCE-CONNECTION-TEST-1:testwarehouseconnection:495'),
  jsonb_build_object(
    'purpose', 'Let users test the selected governed warehouse connection before browsing and importing source tables.',
    'owner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apiRail', 'POST /workspace/warehouse/connections/:connectionId/test'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-CONNECTION-TEST-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Expose the existing testWarehouseConnection port from the Add Source Connections section and render the authoritative pass/fail result without adding a fake adapter.',
    'userStories', jsonb_build_array(
      'As a demanding Canvas user, I can test the selected governed warehouse connection before discovering source tables.',
      'As an operator, connection test results come from the existing workspace warehouse connection test API rail.'
    ),
    'componentGuides', jsonb_build_array('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'architectureGuards', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx'),
    'cypressFlows', jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'TestWarehouseConnection',
        'type', 'command',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'adapterSurface', 'POST /workspace/warehouse/connections/:connectionId/test'
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
      'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
      'apps/web/src/app/components/sourceImportWizard/types.ts',
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'apps/web/src/app/components/SourceImportWizard.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'tools/planning-db/migrations/495_source_import_connection_test_affordance.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/api/**#fake_connection_test',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'docs/planning/**#manual_primary_source'
    ),
    'domainObjects', jsonb_build_array(
      'WarehouseConnection',
      'TestWarehouseConnectionResult',
      'SourceImportWizardState'
    ),
    'fowlerSignals', jsonb_build_array(
      'application_port_invocation',
      'presentation_component',
      'single_responsibility',
      'no_fake_success_path'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-CONNECTION-TEST-PRESENTATION-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx',
        'expectedFailure', 'EXPECTED_BUTTON:Test connection',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
          'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'ConnectionStep',
        'path', 'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'useSourceImportWizard',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('application_port_invocation', 'state_coordinator'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'WizardStepContent',
        'path', 'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('presentation_composition'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    )
  ),
  1,
  'codex'
)
on conflict (rail_id) do update
set
  mechanization_status = excluded.mechanization_status,
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
