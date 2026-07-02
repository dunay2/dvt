-- DB-first authority for two small governed slices:
-- 1. Feature-mechanization query --filter maps to feature_id.
-- 2. Add Source browse exposes searchable source catalog plus active metadata.

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
  'local#D-FEATURE-MECH-FILTER-QUERY-1#query#listfeaturemechanizationfeatures',
  'D-FEATURE-MECH-FILTER-QUERY-1',
  'implemented',
  'ListFeatureMechanizationFeatures',
  'listfeaturemechanizationfeatures',
  'query',
  'planning-db.query.FeatureMechanizationReadModel',
  'implemented',
  jsonb_build_array(
    'scripts/planning-db-query.cjs#featureIdCommonFilterQueryNames',
    'scripts/planning-db-query.cjs#applyCommonFilter',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationFeatureRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationComponentRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationSymbolRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationRailRows',
    'scripts/planning-db/queries/feature-mechanization-query.cjs#readFeatureMechanizationValidationRows'
  ),
  jsonb_build_array(
    'scripts/planning-db-query.cjs',
    'scripts/planning-db/queries/feature-mechanization-query.cjs',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql'
  ),
  jsonb_build_array('planning-db:query/feature-mechanization'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'scripts/planning-db-query.cjs',
    'scripts/planning-db/queries/feature-mechanization-query.cjs',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql'
  ),
  jsonb_build_array(
    'node --test scripts/planning-db-query.test.cjs --test-name-pattern "feature mechanization"',
    'pnpm planning:db:query feature-mechanization --filter D-FEATURE-MECH-FILTER-QUERY-1 --limit 20'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'node --test scripts/planning-db-query.test.cjs --test-name-pattern "feature mechanization"',
      'pnpm planning:db:query feature-mechanization --filter E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1 --limit 20',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
  md5('D-FEATURE-MECH-FILTER-QUERY-1:listfeaturemechanizationfeatures:488'),
  jsonb_build_object(
    'purpose', 'Allow operators to inspect feature mechanization manifests by feature_id through the documented --filter flag.',
    'owner', 'planning-db.query.FeatureMechanizationReadModel'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'D-FEATURE-MECH-FILTER-QUERY-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Map feature-mechanization --filter to featureId and apply it across feature, component, symbol, rail, and validation read-model queries.',
    'componentGuides', jsonb_build_array('planning-db.query.FeatureMechanizationReadModel'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db-query.cjs',
      'scripts/planning-db/queries/feature-mechanization-query.cjs',
      'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
      'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/planning/**#manual_feature_mechanization_filter_source',
      'scripts/planning-db-query.cjs#new_parallel_query_name'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListFeatureMechanizationFeatures',
        'type', 'query',
        'dddOwner', 'planning-db.query.FeatureMechanizationReadModel'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'FEATURE-MECH-FILTER-001',
        'redTest', 'node --test scripts/planning-db-query.test.cjs --test-name-pattern "feature mechanization DB-first query filters"',
        'expectedFailure', '--filter is not supported for planning DB query "feature-mechanization".',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-query.cjs',
          'scripts/planning-db/queries/feature-mechanization-query.cjs',
          'scripts/planning-db-query-tests/feature-mechanization.test.cjs'
        ),
        'greenTest', 'node --test scripts/planning-db-query.test.cjs --test-name-pattern "feature mechanization"'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'featureIdCommonFilterQueryNames',
        'path', 'scripts/planning-db-query.cjs',
        'dddOwner', 'planning-db.query.FeatureMechanizationReadModel',
        'cqRails', jsonb_build_array('ListFeatureMechanizationFeatures'),
        'fowlerSignals', jsonb_build_array('explicit_interface', 'single_source_of_truth'),
        'architectureGuard', 'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
        'unitTests', jsonb_build_array('scripts/planning-db-query-tests/feature-mechanization.test.cjs')
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
    'presentation',
    'SourceImportActiveTableMetadata',
    jsonb_build_object(
      'responsibility', 'Render active warehouse table metadata for Browse and Metadata sections without owning wizard flow state.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('SourceImportActiveTableMetadata.tsx:488')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'model',
    'buildSourceImportCatalogViewModel',
    jsonb_build_object(
      'responsibility', 'Project searchable source catalog groups, active metadata target, result counters, and selected table counters.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('sourceImportWizardModel.ts:catalog-search:488')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'composition',
    'SelectionStep',
    jsonb_build_object(
      'responsibility', 'Compose searchable Browse catalog with active metadata preview.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('SelectionStep.tsx:searchable-browse:488')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage', 'Browse searches by column metadata and keeps active metadata visible.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('SourceImportWizard.metadata.test.tsx:searchable-browse:488')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'e2e-test',
    null,
    jsonb_build_object(
      'coverage', 'Live Add Source proof searches by warehouse column before selecting and importing a real source.',
      'rail', 'ImportWarehouseSources',
      'noWorkspaceDraftIntercept', true
    ),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('canvas-source-import-live-clean.cy.ts:search:488')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-CATALOG-SEARCH-MODEL',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Catalog model filters by schema, table, column, and type while preserving selected totals.',
    jsonb_build_object('searchScope', jsonb_build_array('database', 'schema', 'table', 'columnName', 'columnType')),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('EV-SOURCE-IMPORT-CATALOG-SEARCH-MODEL:488')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-CATALOG-SEARCH-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Browse shows a searchable catalog and active metadata before table import.',
    jsonb_build_object('requiresVisibleMetadataInBrowse', true),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('EV-SOURCE-IMPORT-CATALOG-SEARCH-PRESENTATION:488')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-LIVE-CLEAN-SEARCH',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'ImportWarehouseSources',
    'source-import-live-clean',
    'Live Canvas Add Source proof searches real warehouse metadata before importing a source without graph-draft intercepts.',
    jsonb_build_object('noCyInterceptWorkspaceGraphDraft', true),
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
    md5('EV-SOURCE-IMPORT-LIVE-CLEAN-SEARCH:488')
  )
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
  'local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview',
  'E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1',
  'implemented',
  'RenderSourceImportCatalogView',
  'rendersourceimportcatalogview',
  'query',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportCatalogViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#normalizeCatalogSearchValue',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#tableMatchesSourceImportSearch',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx#SourceImportActiveTableMetadata',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx#SelectionStep',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard',
    'apps/web/src/app/components/sourceImportWizard/types.ts#SourceImportWizardState.tableSearchQuery'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql'
  ),
  jsonb_build_array('planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT',
    'buzon/manual de implementacion.txt'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql',
  md5('E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1:rendersourceimportcatalogview:488'),
  jsonb_build_object(
    'purpose', 'Expose searchable Add Source catalog and active warehouse metadata in Browse before import.',
    'owner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Close the first Add Source demanding-user gap by making Browse searchable by schema/table/column/type and by keeping active real metadata visible during source selection.',
    'componentGuides', jsonb_build_array(
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'web.component.canvas.SourceImportDialog'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT',
      'buzon/manual de implementacion.txt'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/types.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
      'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'tools/planning-db/migrations/488_feature_mechanization_filter_and_source_import_search.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/api/**#fake_catalog_metadata',
      'docs/planning/**#manual_primary_source'
    ),
    'domainObjects', jsonb_build_array(
      'WarehouseTable',
      'SourceImportCatalogViewModel',
      'SourceImportActiveTableMetadata',
      'SourceImportWizardState'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderSourceImportCatalogView',
        'type', 'query',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
      ),
      jsonb_build_object(
        'name', 'ListWarehouseConnectionTables',
        'type', 'query',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe'
      ),
      jsonb_build_object(
        'name', 'ImportWarehouseSources',
        'type', 'command',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-SEARCH-MODEL-001',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'expectedFailure', 'SourceImportCatalogViewModel had no search result counters or search filtering.',
        'patchSurfaces', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-SEARCH-PRESENTATION-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx',
        'expectedFailure', 'Browse had no table search input and metadata was not visible while selecting source tables.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
          'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
          'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'SourceImportActiveTableMetadata',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'tableMatchesSourceImportSearch',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('pure_function', 'read_model_projection'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
