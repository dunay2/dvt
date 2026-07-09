-- Rehydrate the active ListWarehouseConnections query rail as DB-first Source
-- Import catalog data. This is not a new product rail: it supersedes the
-- imported documentation-backed row that command_query_rail_query still showed
-- from frontend-component-inventory.md.

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
  'ListWarehouseConnections',
  'query',
  'implemented-ui',
  jsonb_build_object(
    'purpose', 'List governed warehouse connections available to the Add Source dialog before table discovery.',
    'owner', 'Warehouse connection read model',
    'port', 'IWarehouseSourceImportPort.listWarehouseConnections',
    'adapterSurface', 'GET /workspace/warehouse/connections',
    'negativeTests', jsonb_build_array(
      'missing workspace scope cannot list governed warehouse connections',
      'unauthorized users cannot browse workspace warehouse connections'
    )
  ),
  'tools/planning-db/migrations/583_source_import_list_connections_dbfirst_rail.sql',
  md5('SourceImportDialog:ListWarehouseConnections:583')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
  'local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#query#listwarehouseconnections',
  'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
  'implemented',
  'ListWarehouseConnections',
  'listwarehouseconnections',
  'query',
  'Warehouse connection read model',
  'implemented',
  jsonb_build_array(
    'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts#ListWarehouseConnectionsUseCase',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts#registerWarehouseSourceImportRoutes',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts#listWarehouseConnections',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts#useConnectionsLoader',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx#ConnectionStep'
  ),
  jsonb_build_array(
    'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts',
    'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'scripts/run-canvas-source-import-live-proof.cjs',
    'tools/planning-db/migrations/583_source_import_list_connections_dbfirst_rail.sql'
  ),
  jsonb_build_array(
    'planning-db:component/web.component.canvas.SourceImportDialog',
    'planning-db:rail/ListWarehouseConnections'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts',
    'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'scripts/run-canvas-source-import-live-proof.cjs',
    'tools/planning-db/migrations/583_source_import_list_connections_dbfirst_rail.sql'
  ),
  jsonb_build_array(
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'scripts/planning-db-migrate.test.cjs',
    'pnpm test:web:e2e:source-import:live'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter dvt-api exec vitest run test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.test.tsx',
      'pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePorts.imports.test.ts',
      'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "source import list connections DB-first rail"',
      'pnpm test:web:e2e:source-import:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining',
    true
  ),
  'tools/planning-db/migrations/583_source_import_list_connections_dbfirst_rail.sql',
  md5('DVT-CANVAS-UXDB-SOURCE-DIALOG-1:ListWarehouseConnections:583'),
  jsonb_build_object(
    'purpose', 'Expose governed workspace warehouse connections to the contextual Source Import dialog.',
    'owner', 'Warehouse connection read model',
    'component', 'web.component.canvas.SourceImportDialog',
    'port', 'IWarehouseSourceImportPort.listWarehouseConnections',
    'adapterSurface', 'GET /workspace/warehouse/connections',
    'supersedesSourcePath', 'docs/architecture/components/web/frontend-component-inventory.md'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'userStories', jsonb_build_array(
      'As a demanding Canvas user, I can open Add Source and see the governed warehouse connections that are available for the active workspace.',
      'As an operator, the Add Source connection list comes from the existing workspace warehouse connection read model, not from a hard-coded browser catalog.'
    ),
    'implementationPlan', 'Use the existing ListWarehouseConnections query rail as the Add Source connection list read model; do not create a parallel SourceImport-specific alias.',
    'componentGuides', jsonb_build_array('web.component.canvas.SourceImportDialog'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'domainObjects', jsonb_build_array(
      'WarehouseConnection',
      'WarehouseConnectionReadModel',
      'SourceImportWizardState'
    ),
    'fowlerSignals', jsonb_build_array(
      'single_query_rail',
      'read_model_boundary',
      'presentation_data_loader',
      'no_parallel_source_import_alias',
      'db_first_catalog_source'
    ),
    'architectureGuards', jsonb_build_array(
      'scripts/planning-db-migrate.test.cjs',
      'apps/web/src/app/components/SourceImportWizard.test.tsx',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "source import list connections DB-first rail"',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm test:web:e2e:source-import:live',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListWarehouseConnections',
        'type', 'query',
        'dddOwner', 'Warehouse connection read model',
        'adapterSurface', 'GET /workspace/warehouse/connections'
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts',
      'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
      'apps/web/src/app/services/workspace/workspacePorts.api.ts',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts',
      'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/src/app/**#sourceImportAvailable_false',
      'docs/architecture/components/web/frontend-component-inventory.md#active_source_of_truth'
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListWarehouseConnectionsUseCase',
        'path', 'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts',
        'dddOwner', 'Warehouse connection read model',
        'cqRails', jsonb_build_array('ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('query_application_service', 'read_model_boundary'),
        'architectureGuard', 'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts')
      ),
      jsonb_build_object(
        'name', 'useConnectionsLoader',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('presentation_data_loader', 'port_adapter_boundary'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-LIST-CONNECTIONS-DBFIRST-001',
        'redTest', 'pnpm planning:db:query command-query-rails --filter ListWarehouseConnections --limit 20 --no-refresh',
        'expectedFailure', 'ListWarehouseConnections source_path still points at docs/architecture/components/web/frontend-component-inventory.md.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/583_source_import_list_connections_dbfirst_rail.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest', 'pnpm planning:db:query command-query-rails --filter ListWarehouseConnections --limit 20 --no-refresh'
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
