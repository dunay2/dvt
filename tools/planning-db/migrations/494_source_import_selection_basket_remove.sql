-- DB-first authority for correcting selected source tables from the Add Source basket.
-- The behavior stays inside RenderSourceImportCatalogView; it does not create a
-- second selection command or alter the downstream ImportWarehouseSources command.

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
  'local#E-CANVAS-ADD-SOURCE-BASKET-REMOVE-1#query#rendersourceimportcatalogview',
  'E-CANVAS-ADD-SOURCE-BASKET-REMOVE-1',
  'implemented',
  'RenderSourceImportCatalogView',
  'rendersourceimportcatalogview',
  'query',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx#SourceImportSelectionBasket',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx#SelectionStep',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx#ReviewStep',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx#WizardStepContent',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx#createSourceImportWizardHarness'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'tools/planning-db/migrations/494_source_import_selection_basket_remove.sql'
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
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'tools/planning-db/migrations/494_source_import_selection_basket_remove.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining',
    true
  ),
  'tools/planning-db/migrations/494_source_import_selection_basket_remove.sql',
  md5('E-CANVAS-ADD-SOURCE-BASKET-REMOVE-1:rendersourceimportcatalogview:494'),
  jsonb_build_object(
    'purpose', 'Render an explicit remove action for selected Add Source tables without leaving metadata inspection.',
    'owner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-BASKET-REMOVE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Let users correct selected source tables from the Add Source basket and final review while preserving active metadata inspection.',
    'userStories', jsonb_build_array(
      'As a demanding Canvas user, I can remove a mistaken source table directly from the selected-source basket.',
      'As a DVT/Raven author, removing a selected source does not clear the active metadata I am inspecting.'
    ),
    'componentGuides', jsonb_build_array('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderSourceImportCatalogView',
        'type', 'query',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
      'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
      'tools/planning-db/migrations/494_source_import_selection_basket_remove.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/api/**#source_import_selection_correction',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'docs/planning/**#manual_primary_source'
    ),
    'domainObjects', jsonb_build_array(
      'SourceImportSelectionBasket',
      'SourceImportCatalogViewModel',
      'SourceImportTableViewModel'
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_component',
      'explicit_interface',
      'single_responsibility',
      'no_duplicate_selection_mechanism'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-BASKET-REMOVE-PRESENTATION-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx',
        'expectedFailure', 'EXPECTED_BUTTON_LABEL:Remove RAW.ERP.ORDERS',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
          'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'SourceImportSelectionBasket',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SelectionStep',
        'path', 'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_composition', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'ReviewStep',
        'path', 'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_composition', 'final_review'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'createSourceImportWizardHarness',
        'path', 'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('test_driver', 'semantic_interaction'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
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
