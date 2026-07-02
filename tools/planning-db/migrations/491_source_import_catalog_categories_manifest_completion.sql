-- Complete the DB-first feature mechanization manifest for migration 490 after
-- local application, without mutating the already-applied migration checksum.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#SourceImportDatabaseGroupViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#formatSourceImportSchemaCount',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportSchemaGroup',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportCatalogViewModel',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx#SourceImportCatalogView',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportDatabaseGroup',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportDatabaseHeader',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportDatabaseHeaderProps',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx#selectionBasketClassNames',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx#SourceImportSelectionBasketProps',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx#SourceImportSelectionBasket'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql',
    'tools/planning-db/migrations/491_source_import_catalog_categories_manifest_completion.sql'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql',
    'tools/planning-db/migrations/491_source_import_catalog_categories_manifest_completion.sql'
  ),
  architecture_guards = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  completion_gate = jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
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
  raw_manifest = raw_manifest || jsonb_build_object(
    'userStories',
    jsonb_build_array(
      'As a DVT/Raven author, I can browse source tables by database, schema, and table instead of scanning a flat schema list.',
      'As a demanding Canvas user, I can see selected source tables in Browse before submitting ImportWarehouseSources.'
    ),
    'architectureGuards',
    jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'cypressFlows',
    jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-CATEGORY-MODEL-001',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'expectedFailure', 'SourceImportCatalogViewModel does not expose databaseGroups.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-SELECTION-BASKET-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
        'expectedFailure', 'Browse does not show database categories or a selected-source basket.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
          'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
          'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'SourceImportDatabaseGroupViewModel',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('read_model_projection', 'explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'formatSourceImportSchemaCount',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('pure_function', 'presentation_model'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildSourceImportSchemaGroup',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('pure_function', 'read_model_projection'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'SourceImportDatabaseHeaderProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_contract'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportDatabaseGroup',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportDatabaseHeader',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'selectionBasketClassNames',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_tokens'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportSelectionBasketProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_contract', 'parameter_object'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportSelectionBasket',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/491_source_import_catalog_categories_manifest_completion.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:manifest-completion:491'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1';
