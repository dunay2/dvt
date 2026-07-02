-- Completes DB-first feature mechanization manifests for migration 488 rows
-- that were applied locally before the mandatory closeout fields were added.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'scripts/planning-db-query.cjs#featureIdCommonFilterQueryNames',
    'scripts/planning-db-query.cjs#railCommonFilterQueryNames',
    'scripts/planning-db-query.cjs#applyCommonFilter',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationFeatureRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationComponentRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationSymbolRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationRailRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationValidationRows'
  ),
  implementation_refs = jsonb_build_array(
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db/queries/feature-mechanization-query.cjs',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    'tools/planning-db/migrations/489_feature_mechanization_filter_manifest_completion.sql'
  ),
  governing_sources = jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db/queries/feature-mechanization-query.cjs',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    'tools/planning-db/migrations/489_feature_mechanization_filter_manifest_completion.sql'
  ),
  architecture_guards = jsonb_build_array(
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs'
  ),
  completion_gate = jsonb_build_object(
    'tests',
    jsonb_build_array(
      'node --test scripts/planning-db-query.test.cjs --test-name-pattern "feature mechanization|command/query rail"',
      'pnpm planning:db:query command-query-rails --filter RenderSourceImportCatalogView --limit 20',
      'pnpm planning:db:query feature-mechanization --filter D-FEATURE-MECH-FILTER-QUERY-1 --limit 20',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining',
    true
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'governingSources',
    jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db/queries/feature-mechanization-query.cjs',
      'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
      'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
      'tools/planning-db/migrations/489_feature_mechanization_filter_manifest_completion.sql'
    ),
    'domainObjects',
    jsonb_build_array(
      'planning-db.query.FeatureMechanizationReadModel',
      'planning-db.query.CommandQueryRailReadModel',
      'PlanningDbQueryCliOptions'
    ),
    'fowlerSignals',
    jsonb_build_array(
      'explicit_interface',
      'single_source_of_truth',
      'duplicate_semantics_removed'
    ),
    'architectureGuards',
    jsonb_build_array(
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-query-tests/feature-mechanization.test.cjs'
    ),
    'cypressFlows',
    jsonb_build_array(
      'not_applicable: planning DB query CLI behavior is covered by Node tests and real DB query proof'
    ),
    'completionGate',
    jsonb_build_array(
      'node --test scripts/planning-db-query.test.cjs --test-name-pattern "feature mechanization|command/query rail"',
      'pnpm planning:db:query command-query-rails --filter RenderSourceImportCatalogView --limit 20',
      'pnpm planning:db:query feature-mechanization --filter D-FEATURE-MECH-FILTER-QUERY-1 --limit 20',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'userStories',
    jsonb_build_array(
      'As an operator, I can filter feature-mechanization read models by feature id without scanning every manifest.',
      'As an architect, I can filter command/query rails by rail name through the same documented --filter affordance.'
    ),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'ListFeatureMechanizationFeatures',
        'type',
        'query',
        'dddOwner',
        'planning-db.query.FeatureMechanizationReadModel'
      ),
      jsonb_build_object(
        'name',
        'ListCommandQueryRails',
        'type',
        'query',
        'dddOwner',
        'planning-db.query.CommandQueryRailReadModel'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'featureIdCommonFilterQueryNames',
        'path',
        'scripts/planning-db-query.cjs',
        'dddOwner',
        'planning-db.query.FeatureMechanizationReadModel',
        'cqRails',
        jsonb_build_array('ListFeatureMechanizationFeatures'),
        'fowlerSignals',
        jsonb_build_array('explicit_interface', 'single_source_of_truth'),
        'architectureGuard',
        'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
        'cypressCoverage',
        'not_applicable: planning DB CLI query behavior',
        'unitTests',
        jsonb_build_array('scripts/planning-db-query-tests/feature-mechanization.test.cjs')
      ),
      jsonb_build_object(
        'name',
        'railCommonFilterQueryNames',
        'path',
        'scripts/planning-db-query.cjs',
        'dddOwner',
        'planning-db.query.CommandQueryRailReadModel',
        'cqRails',
        jsonb_build_array('ListCommandQueryRails'),
        'fowlerSignals',
        jsonb_build_array('explicit_interface', 'single_source_of_truth'),
        'architectureGuard',
        'scripts/planning-db-query.test.cjs',
        'cypressCoverage',
        'not_applicable: planning DB CLI query behavior',
        'unitTests',
        jsonb_build_array('scripts/planning-db-query.test.cjs')
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/489_feature_mechanization_filter_manifest_completion.sql',
  source_content_sha256 = md5('D-FEATURE-MECH-FILTER-QUERY-1:manifest-completion:489'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'D-FEATURE-MECH-FILTER-QUERY-1'
  and not (raw_manifest ? 'userStories');

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportCatalogViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#normalizeCatalogSearchValue',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#tableMatchesSourceImportSearch',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx#SourceImportActiveTableMetadata',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx#SourceImportActiveTableMetadataProps',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx#SelectionStep',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard',
    'apps/web/src/app/components/sourceImportWizard/types.ts#SourceImportWizardState.tableSearchQuery'
  ),
  architecture_guards = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  completion_gate = jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
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
    'fowlerSignals',
    jsonb_build_array(
      'read_model_projection',
      'presentation_component',
      'single_responsibility',
      'no_fake_metadata'
    ),
    'architectureGuards',
    jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
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
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'userStories',
    jsonb_build_array(
      'As a DVT/Raven author, I can search the Add Source catalog by schema, table, column, or type before importing a source.',
      'As a demanding Canvas user, I can inspect real table metadata while selecting warehouse sources, without a fake draft flow.'
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'SourceImportActiveTableMetadata',
        'path',
        'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails',
        jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals',
        jsonb_build_array('presentation_component', 'single_responsibility'),
        'architectureGuard',
        'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests',
        jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name',
        'SourceImportActiveTableMetadataProps',
        'path',
        'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails',
        jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals',
        jsonb_build_array('presentation_contract', 'parameter_object'),
        'architectureGuard',
        'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests',
        jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name',
        'normalizeCatalogSearchValue',
        'path',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails',
        jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals',
        jsonb_build_array('pure_function', 'search_normalization'),
        'architectureGuard',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests',
        jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name',
        'tableMatchesSourceImportSearch',
        'path',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails',
        jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals',
        jsonb_build_array('pure_function', 'read_model_projection'),
        'architectureGuard',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests',
        jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/489_feature_mechanization_filter_manifest_completion.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1:manifest-completion:489'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1'
  and not (raw_manifest ? 'userStories');
