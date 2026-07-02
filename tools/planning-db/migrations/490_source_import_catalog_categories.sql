-- DB-first authority for Add Source catalog categorization.
-- Reuses RenderSourceImportCatalogView instead of creating a synonym rail.

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
  'local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview',
  'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1',
  'implemented',
  'RenderSourceImportCatalogView',
  'rendersourceimportcatalogview',
  'query',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#SourceImportDatabaseGroupViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportCatalogViewModel',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx#SourceImportCatalogView',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportDatabaseHeader',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx#SourceImportSelectionBasket'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql'
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
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/490_source_import_catalog_categories.sql',
  md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:rendersourceimportcatalogview:490'),
  jsonb_build_object(
    'purpose', 'Render Add Source as a categorized database/schema/table catalog with a clear selected-source basket.',
    'owner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Project source import catalog as database -> schema -> table, render that hierarchy in Browse, and expose selected tables as a clear basket before import.',
    'componentGuides', jsonb_build_array('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'tools/planning-db/migrations/490_source_import_catalog_categories.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/api/**#fake_catalog_category',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'docs/planning/**#manual_primary_source'
    ),
    'domainObjects', jsonb_build_array(
      'WarehouseTable',
      'SourceImportCatalogViewModel',
      'SourceImportDatabaseGroupViewModel',
      'SourceImportSelectionBasket'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderSourceImportCatalogView',
        'type', 'query',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
      ),
      jsonb_build_object(
        'name', 'ImportWarehouseSources',
        'type', 'command',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'read_model_projection',
      'single_responsibility',
      'presentation_component',
      'no_fake_metadata'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-CATEGORY-MODEL-001',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'expectedFailure', 'SourceImportCatalogViewModel does not expose databaseGroups.',
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-SELECTION-BASKET-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
        'expectedFailure', 'Browse does not show database categories or a selected-source basket.',
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx'
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
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'presentation',
    'SourceImportSelectionBasket',
    jsonb_build_object(
      'responsibility', 'Render selected source tables as a visible basket without owning import state.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql',
    md5('SourceImportSelectionBasket.tsx:490')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'presentation',
    'SourceImportCatalogView',
    jsonb_build_object(
      'responsibility', 'Render database, schema, and table catalog groups from SourceImportCatalogViewModel.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql',
    md5('SourceImportCatalogView.tsx:database-categories:490')
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
    'EV-SOURCE-IMPORT-CATALOG-DATABASE-GROUPS',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Catalog model groups visible source tables by database and schema before rendering.',
    jsonb_build_object('groupingHierarchy', jsonb_build_array('database', 'schema', 'table')),
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql',
    md5('EV-SOURCE-IMPORT-CATALOG-DATABASE-GROUPS:490')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-SELECTION-BASKET',
    'presentation-test',
    'current',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Browse exposes selected source tables before the import command is submitted.',
    jsonb_build_object('requiresSelectionBasket', true),
    'tools/planning-db/migrations/490_source_import_catalog_categories.sql',
    md5('EV-SOURCE-IMPORT-SELECTION-BASKET:490')
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
