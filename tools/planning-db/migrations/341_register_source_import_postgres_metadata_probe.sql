-- DB-first authority for Postgres source-import metadata discovery.
-- The Add Source explorer depends on this API probe to populate the governed
-- catalog with table row counts, column metadata, and basic key constraints.

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
  'local#E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1#query#listwarehouseconnectiontables',
  'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
  'implemented',
  'ListWarehouseConnectionTables',
  'listwarehouseconnectiontables',
  'query',
  'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
  'implemented',
  jsonb_build_array(
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#PostgresColumnDiscoveryRow',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#PostgresTableDiscoveryRow',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#groupPostgresColumnsByTable',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#parseOptionalRowCount',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#postgresTableKey',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#toWarehouseTable'
  ),
  jsonb_build_array(
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/341_register_source_import_postgres_metadata_probe.sql'
  ),
  jsonb_build_array(
    'planning-db:task/E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
    'planning-db:rail/ListWarehouseConnectionTables',
    'planning-db:rail/CreateWarehouseConnection',
    'planning-db:rail/TestWarehouseConnection'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/341_register_source_import_postgres_metadata_probe.sql'
  ),
  jsonb_build_array(
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_object(
    'tests', jsonb_build_array(
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
      'pnpm --filter dvt-api typecheck',
      'pnpm --filter dvt-api lint',
      'node --test --test-name-pattern "tracked migrations register Source Import Postgres metadata probe feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/341_register_source_import_postgres_metadata_probe.sql',
  md5('E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1:ListWarehouseConnectionTables:341'),
  jsonb_build_object(
    'purpose', 'Populate Postgres Source Import discovery with table row counts, columns, nullability, and basic key constraints.',
    'owner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
    'query', 'ListWarehouseConnectionTables',
    'commandsAffected', jsonb_build_array('CreateWarehouseConnection', 'TestWarehouseConnection')
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extend the real Postgres warehouse source-import probe so Add Source has governed table row counts and column metadata instead of presenting unknown metadata while the rail is available.',
    'componentGuides', jsonb_build_array(
      'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
      'web.component.canvas.SourceImportDialog'
    ),
    'userStories', jsonb_build_array(
      'As a DVT/Raven author, when I create or test a Postgres warehouse connection for Add Source, the discovered tables carry row counts and column metadata into the governed catalog.',
      'As a frontend reviewer, Source Import remains enabled through the real protected runtime rail; missing metadata is fixed at the probe instead of hidden behind a feature flag.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListWarehouseConnectionTables',
        'type', 'query',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe'
      ),
      jsonb_build_object(
        'name', 'CreateWarehouseConnection',
        'type', 'command',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe'
      ),
      jsonb_build_object(
        'name', 'TestWarehouseConnection',
        'type', 'command',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe'
      )
    ),
    'domainObjects', jsonb_build_array(
      'WorkspaceWarehouseConnectionProbe',
      'WarehouseTable',
      'WarehouseColumn',
      'WarehouseConnectionCatalogEntry'
    ),
    'fowlerSignals', jsonb_build_array(
      'missing_read_model_data',
      'fake_flow_risk',
      'hidden_authority'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'node --test --test-name-pattern "tracked migrations register Source Import Postgres metadata probe feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable: API probe metadata slice; live Add Source browser proof remains owned by E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-POSTGRES-METADATA-PROBE-001',
        'redTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'expectedFailure', 'WorkspaceWarehouseConnectionProbe returned table identities without rowCount or columns.',
        'patchSurfaces', jsonb_build_array(
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'
        ),
        'greenTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'
      ),
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-POSTGRES-METADATA-MANIFEST-001',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'New Postgres metadata probe symbols were not declared in Planning DB feature mechanization.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/341_register_source_import_postgres_metadata_probe.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'PostgresColumnDiscoveryRow',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables', 'CreateWarehouseConnection', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: API metadata projection has package tests; live browser flow remains separate',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      ),
      jsonb_build_object(
        'name', 'PostgresTableDiscoveryRow',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables', 'CreateWarehouseConnection', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: API metadata projection has package tests; live browser flow remains separate',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      ),
      jsonb_build_object(
        'name', 'groupPostgresColumnsByTable',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables', 'CreateWarehouseConnection', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: pure API projection helper',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      ),
      jsonb_build_object(
        'name', 'parseOptionalRowCount',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables', 'CreateWarehouseConnection', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: pure API projection helper',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      ),
      jsonb_build_object(
        'name', 'postgresTableKey',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables', 'CreateWarehouseConnection', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: pure API projection helper',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      ),
      jsonb_build_object(
        'name', 'toWarehouseTable',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables', 'CreateWarehouseConnection', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'cypressCoverage', 'not_applicable: pure API projection helper',
        'unitTests', jsonb_build_array('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts')
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/341_register_source_import_postgres_metadata_probe.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/services/workspace/workspacePorts.api.ts#sourceImportAvailable_false',
      'apps/web/src/app/components/sourceImportWizard/**#null_backend_stub',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
      'pnpm --filter dvt-api typecheck',
      'pnpm --filter dvt-api lint',
      'node --test --test-name-pattern "tracked migrations register Source Import Postgres metadata probe feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  0,
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
