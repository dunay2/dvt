-- DB-first authority for warehouse source byte-size metadata.
-- The same catalog-owned byteSize discovered from Postgres must survive
-- ListWarehouseConnectionTables, ImportWarehouseSources, source-import
-- catalog presentation, and GraphNodeCard rendering.

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
  'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#listwarehouseconnectiontables',
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  'implemented',
  'ListWarehouseConnectionTables',
  'listwarehouseconnectiontables',
  'query',
  'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
  'implemented',
  jsonb_build_array(
    'apps/api/src/application/ports/warehouseSourceImport.ts#WarehouseTable.byteSize',
    'apps/web/src/app/ports/workspace.ts#WarehouseTable.byteSize',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#PostgresTableDiscoveryRow.byte_size',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#parseOptionalByteSize',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#parseOptionalNonNegativeInteger',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#toWarehouseTable',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts#WarehouseTableCatalogSchema.byteSize',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts#parseTables'
  ),
  jsonb_build_array(
    'apps/api/src/application/ports/warehouseSourceImport.ts',
    'apps/web/src/app/ports/workspace.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql'
  ),
  jsonb_build_array(
    'planning-db:feature/E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
    'planning-db:rail/ListWarehouseConnectionTables',
    'planning-db:rail/ImportWarehouseSources',
    'planning-db:rail/RenderSourceImportCatalogView',
    'planning-db:rail/RenderCanvasGraphNodeCard'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'buzon/manual de implementacion.txt'
  ),
  jsonb_build_array(
    'apps/api/src/application/ports/warehouseSourceImport.ts',
    'apps/web/src/app/ports/workspace.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql'
  ),
  jsonb_build_array(
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'node --test --test-name-pattern "source import byte-size metadata" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql',
  md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:listwarehouseconnectiontables:487'),
  jsonb_build_object(
    'purpose', 'Discover and transport real warehouse table byte sizes as catalog-owned source metadata.',
    'owner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
    'query', 'ListWarehouseConnectionTables'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extend the existing warehouse source import rails so real Postgres relation byte size is discovered, persisted in the governed catalog, returned by HTTP, imported into graph node metadata, and rendered by existing source-import/catalog/card presenters without inventing metrics.',
    'componentGuides', jsonb_build_array(
      'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
      'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionCatalog',
      'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
      'web.component.canvas.SourceImportCatalogViewPresentation',
      'web.component.canvas.GraphNodeCard'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/manual de implementacion.txt'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/api/src/application/ports/warehouseSourceImport.ts',
      'apps/web/src/app/ports/workspace.ts',
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
      'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/web/src/app/components/sourceImportWizard/types.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'apps/web/src/testing/workspacePortDoubles.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/plugins/graph/**#invented_byte_size',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/api/src/application/services/**#hardcoded_size'
    ),
    'domainObjects', jsonb_build_array(
      'WarehouseTable',
      'WarehouseConnectionCatalogEntry',
      'WorkspaceGraphAuthoringNode.metadata',
      'SourceImportTableViewModel',
      'GraphNodeCardReadModel'
    ),
    'fowlerSignals', jsonb_build_array(
      'published_language',
      'explicit_interface',
      'read_model_projection',
      'single_source_of_truth'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable: byte-size propagation is covered at rail/presenter level; live source import browser proof remains owned by E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/application/services/importWarehouseSourcesUseCase.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'node --test --test-name-pattern "source import byte-size metadata" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'userStories', jsonb_build_array(
      'As a DVT/Raven author, Add Source shows table byte size when the warehouse exposes it.',
      'As a Canvas user, imported source cards can render storage size without inventing metrics.'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'ListWarehouseConnectionTables', 'type', 'query', 'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe'),
      jsonb_build_object('name', 'ImportWarehouseSources', 'type', 'command', 'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'),
      jsonb_build_object('name', 'RenderSourceImportCatalogView', 'type', 'query', 'dddOwner', 'web.component.canvas.SourceImportCatalogViewPresentation'),
      jsonb_build_object('name', 'RenderCanvasGraphNodeCard', 'type', 'query', 'dddOwner', 'web.component.canvas.GraphNodeCard')
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-BYTE-SIZE-PROBE-001',
        'redTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'expectedFailure', 'Postgres table discovery returned rowCount and columns but no byteSize.',
        'patchSurfaces', jsonb_build_array('apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts'),
        'greenTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'
      ),
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-BYTE-SIZE-PRESENTATION-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'expectedFailure', 'Source Import catalog table card omitted the byte-size metric from the table affordance.',
        'patchSurfaces', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx'),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'WarehouseTable.byteSize',
        'path', 'apps/api/src/application/ports/warehouseSourceImport.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WarehouseTable',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables', 'ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('explicit_interface', 'published_language'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: DTO propagation is covered by API and presentation tests',
        'unitTests', jsonb_build_array(
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
          'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'PostgresTableDiscoveryRow.byte_size',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: database probe has package test coverage',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      ),
      jsonb_build_object(
        'name', 'parseOptionalByteSize',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: pure parser helper',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      ),
      jsonb_build_object(
        'name', 'parseOptionalNonNegativeInteger',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: pure parser helper',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
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
  'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources',
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  'implemented',
  'ImportWarehouseSources',
  'importwarehousesources',
  'command',
  'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
  'implemented',
  jsonb_build_array(
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#toSourceNode',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts#parseTables',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#formatSourceImportByteSize',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportTableViewModel',
    'apps/web/src/testing/workspacePortDoubles.ts#createImportedSourceNode'
  ),
  jsonb_build_array(
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/testing/workspacePortDoubles.ts',
    'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql'
  ),
  jsonb_build_array(
    'planning-db:feature/E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
    'planning-db:rail/ImportWarehouseSources',
    'planning-db:rail/RenderSourceImportCatalogView',
    'planning-db:rail/RenderCanvasGraphNodeCard'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'buzon/manual de implementacion.txt'
  ),
  jsonb_build_array(
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/testing/workspacePortDoubles.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql'
  ),
  jsonb_build_array(
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'node --test --test-name-pattern "source import byte-size metadata" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql',
  md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:importwarehousesources:487'),
  jsonb_build_object(
    'purpose', 'Persist and present catalog-owned byteSize metadata during source import.',
    'owner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
    'command', 'ImportWarehouseSources'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Preserve catalog-owned byteSize through source import and surface it in the Source Import catalog plus imported graph-node metadata.',
    'componentGuides', jsonb_build_array(
      'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
      'web.component.canvas.SourceImportCatalogViewPresentation',
      'web.component.canvas.GraphNodeCard'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/manual de implementacion.txt'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/api/src/application/ports/warehouseSourceImport.ts',
      'apps/web/src/app/ports/workspace.ts',
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/web/src/app/components/sourceImportWizard/types.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'apps/web/src/testing/workspacePortDoubles.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/plugins/graph/**#invented_byte_size',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/api/src/application/services/**#hardcoded_size'
    ),
    'domainObjects', jsonb_build_array(
      'WarehouseTable',
      'ImportWarehouseSourcesInput',
      'WorkspaceGraphAuthoringNode.metadata',
      'SourceImportTableViewModel'
    ),
    'fowlerSignals', jsonb_build_array(
      'published_language',
      'read_model_projection',
      'application_service',
      'single_source_of_truth'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable: this slice preserves DTO/read-model metadata; live Add Source browser flow remains owned by E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'node --test --test-name-pattern "source import byte-size metadata" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'ImportWarehouseSources', 'type', 'command', 'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'),
      jsonb_build_object('name', 'RenderSourceImportCatalogView', 'type', 'query', 'dddOwner', 'web.component.canvas.SourceImportCatalogViewPresentation'),
      jsonb_build_object('name', 'RenderCanvasGraphNodeCard', 'type', 'query', 'dddOwner', 'web.component.canvas.GraphNodeCard')
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-BYTE-SIZE-COMMAND-001',
        'redTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
        'expectedFailure', 'Imported graph node metadata omitted catalog-owned byteSize.',
        'patchSurfaces', jsonb_build_array('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
        'greenTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'toSourceNode',
        'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('read_model_projection'),
        'architectureGuard', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
        'cypressCoverage', 'not_applicable: application command projection has package tests',
        'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')
      ),
      jsonb_build_object(
        'name', 'formatSourceImportByteSize',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'web.component.canvas.SourceImportCatalogViewPresentation',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('read_model_projection'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'not_applicable: presentation model has unit test coverage',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'createImportedSourceNode',
        'path', 'apps/web/src/testing/workspacePortDoubles.ts',
        'dddOwner', 'web.testing.workspacePortDoubles',
        'cqRails', jsonb_build_array('ImportWarehouseSources', 'RenderCanvasGraphNodeCard'),
        'fowlerSignals', jsonb_build_array('test_double_contract_alignment'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'not_applicable: test double mirrors governed DTO for local harnesses',
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
values (
  'web.component.canvas.SourceImportCatalogViewPresentation',
  'EV-SOURCE-IMPORT-CATALOG-BYTE-SIZE-LABEL',
  'unit-test',
  'current',
  'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
  'RenderSourceImportCatalogView',
  'source-import-catalog-byte-size',
  'Source Import catalog includes byte-size labels when the governed WarehouseTable DTO carries byteSize.',
  jsonb_build_object(
    'redGreen', true,
    'source', 'WarehouseTable.byteSize',
    'noInventedMetrics', true
  ),
  'tools/planning-db/migrations/487_source_import_byte_size_metadata_flow.sql',
  md5('evidence:SourceImportCatalog:byteSize:487')
)
on conflict (component_id, evidence_id) do update set
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
