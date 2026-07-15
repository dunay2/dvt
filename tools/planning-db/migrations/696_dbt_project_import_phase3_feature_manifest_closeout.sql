-- Reconcile the Phase 3 feature manifest with the implementation that replaced
-- receipt-only persistence with one crash-safe import process and completed the
-- protected browser flow. No product rail is added: the feature still exposes
-- ValidateDbtProjectImport and ImportDbtProject.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
    and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
), existing_symbol as (
  select distinct on (path, name)
    replace(
      symbol.item::text,
      'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts',
      'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts'
    )::jsonb as item,
    path,
    name
  from target_rail rail
  cross join lateral jsonb_array_elements(
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
  ) symbol(item)
  cross join lateral (
    values (
      symbol.item ->> 'path',
      coalesce(symbol.item ->> 'name', symbol.item ->> 'symbol')
    )
  ) identity(path, name)
  where path is not null
    and name is not null
    and path <> 'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts'
    and not (
      path = 'apps/api/src/application/ports/dbtProjectImport.ts'
      and name in (
        'DbtProjectImportReceiptKey',
        'DbtProjectImportReceiptRecordResult',
        'DbtProjectImportStoredReceipt',
        'IDbtProjectImportReceiptStore'
      )
    )
  order by path, name, rail.rail_name
), phase3_symbol_group(
  file_path,
  ddd_owner,
  cq_rails,
  fowler_signals,
  architecture_guard,
  cypress_coverage,
  unit_tests,
  symbol_names
) as (
  values
    (
      'apps/api/src/application/ports/dbtProjectImport.ts',
      'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
      jsonb_build_array('ImportDbtProject'),
      jsonb_build_array('Published Language', 'Separated Interface'),
      'pnpm --filter dvt-api test:arch',
      'not_applicable:application_port',
      jsonb_build_array(
        'apps/api/test/application/dbtProjectImportProcessRecovery.test.ts',
        'apps/api/test/application/dbtProjectImportUseCases.test.ts'
      ),
      jsonb_build_array(
        'DbtProjectImportInProgressError',
        'DbtProjectImportProcessBeginResult',
        'DbtProjectImportProcessCompleteResult',
        'DbtProjectImportProcessFailResult',
        'DbtProjectImportProcessKey',
        'DbtProjectImportStoredCompletion',
        'IDbtProjectImportProcessStore'
      )
    ),
    (
      'apps/api/src/application/ports/workspaceFiles.ts',
      'SYS-API-INFRA-WORKSPACE-METADATA-FILES',
      jsonb_build_array('ImportWarehouseSources'),
      jsonb_build_array('Separated Interface', 'Repository'),
      'pnpm --filter dvt-api test:arch',
      'not_applicable:application_port',
      jsonb_build_array(
        'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.test.ts'
      ),
      jsonb_build_array('IWorkspaceMetadataFileRepository')
    ),
    (
      'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts',
      'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS',
      jsonb_build_array('ImportDbtProject'),
      jsonb_build_array('Repository', 'Unit of Work', 'Lease'),
      'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts test/application/dbtProjectImportProcessRecovery.test.ts',
      'not_applicable:persistence_adapter',
      jsonb_build_array(
        'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts',
        'apps/api/test/application/dbtProjectImportProcessRecovery.test.ts'
      ),
      jsonb_build_array(
        'AuthorityRow',
        'BeginInput',
        'CompleteInput',
        'Config',
        'DraftRow',
        'FailInput',
        'OperationRow',
        'PostgresDbtProjectImportProcessStore',
        'RelationRow',
        'asIsoString',
        'assertCanvasId',
        'isLeaseActive',
        'keyValues',
        'mapAuthority',
        'mapCompletion',
        'operationKeyValues',
        'quoteIdentifier',
        'rollbackPreservingError',
        'sameBinding',
        'withTimeout'
      )
    ),
    (
      'apps/api/src/infrastructure/dbt/dbtManifestProjection.ts',
      'SYS-API-INFRA-DBT-PROJECT-FILE-PROJECTION',
      jsonb_build_array('ProjectDbtGraphFromFiles'),
      jsonb_build_array('Mapper', 'Gateway'),
      'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/dbtManifestProjection.test.ts',
      'not_applicable:manifest_projection',
      jsonb_build_array('apps/api/test/infrastructure/dbt/dbtManifestProjection.test.ts'),
      jsonb_build_array('normalizeManifestPath')
    ),
    (
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts',
      'SYS-API-INFRA-WORKSPACE-METADATA-FILES',
      jsonb_build_array('ImportWarehouseSources'),
      jsonb_build_array('Repository', 'Gateway'),
      'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.test.ts',
      'not_applicable:metadata_repository',
      jsonb_build_array(
        'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.test.ts'
      ),
      jsonb_build_array(
        'LocalWorkspaceMetadataFileRepository',
        'MAX_WORKSPACE_METADATA_FILE_BYTES',
        'WORKSPACE_METADATA_PATH_PREFIX',
        'resolveMetadataPath'
      )
    ),
    (
      'apps/api/src/modules/buildProtectedRuntimeModule.ts',
      'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
      jsonb_build_array('ImportDbtProject'),
      jsonb_build_array('Composition Root', 'Service Layer'),
      'pnpm --filter dvt-api exec vitest run test/app/protectedRuntimeComposition.test.ts',
      'not_applicable:composition_root',
      jsonb_build_array('apps/api/test/app/protectedRuntimeComposition.test.ts'),
      jsonb_build_array('MINIMUM_DBT_PROJECT_IMPORT_OPERATION_LEASE_MS')
    ),
    (
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
      jsonb_build_array(
        'ValidateDbtProjectImport',
        'ImportDbtProject',
        'ImportWarehouseSources',
        'ProjectDbtGraphFromFiles'
      ),
      jsonb_build_array('Executable Specification', 'End-to-End Test'),
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array('apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'),
      jsonb_build_array(
        'CANVAS_ID',
        'PROJECT_FILES',
        'PROJECT_ROOT',
        'readRequiredEnv',
        'saveWorkspaceFile',
        'seedDbtProjectFiles',
        'visitCanvas'
      )
    ),
    (
      'apps/web/cypress/support/liveWarehouseSourceImport.ts',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS',
      jsonb_build_array('ImportWarehouseSources'),
      jsonb_build_array('Test Data Builder', 'Gateway'),
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array('apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'),
      jsonb_build_array(
        'ExpectedSourceImportAuthority',
        'createLivePostgresConnection',
        'expectedLivePostgresSourceName',
        'importLivePostgresSource',
        'toStableYamlIdentifierPart'
      )
    ),
    (
      'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx',
      'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
      jsonb_build_array('ValidateDbtProjectImport', 'ImportDbtProject'),
      jsonb_build_array('Supervising Controller', 'Composition'),
      'pnpm --filter @dvt/web exec vitest run src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx'
      ),
      jsonb_build_array('DbtProjectImportDialog', 'DbtProjectImportDialogProps')
    ),
    (
      'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx',
      'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
      jsonb_build_array('ValidateDbtProjectImport', 'ImportDbtProject'),
      jsonb_build_array('Presentation Model', 'Template View'),
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx'
      ),
      jsonb_build_array(
        'DbtProjectImportDialogView',
        'DbtProjectImportDialogViewProps',
        'ImportReceipt',
        'ProjectDiagnostics',
        'ProjectInventory',
        'ProjectSummary',
        'STATUS_TONE_CLASS'
      )
    ),
    (
      'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.ts',
      'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
      jsonb_build_array('ValidateDbtProjectImport', 'ImportDbtProject'),
      jsonb_build_array('Presentation Model', 'Mapper'),
      'pnpm --filter @dvt/web exec vitest run src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.test.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.test.ts'
      ),
      jsonb_build_array(
        'DbtProjectImportInteractionState',
        'DbtProjectImportPhase',
        'DbtProjectImportPresentationModel',
        'PresentationTone',
        'buildDbtProjectImportPresentationModel',
        'formatByteCount',
        'presentDiagnostic',
        'resolveStatus'
      )
    ),
    (
      'apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts',
      'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
      jsonb_build_array('ValidateDbtProjectImport', 'ImportDbtProject'),
      jsonb_build_array('Supervising Controller', 'Application Controller'),
      'pnpm --filter @dvt/web exec vitest run src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx'
      ),
      jsonb_build_array(
        'IMPORT_ERROR_MESSAGE_BY_REASON',
        'INITIAL_STATE',
        'UseDbtProjectImportControllerOptions',
        'createIdempotencyKey',
        'presentImportFailure',
        'readErrorReason',
        'useDbtProjectImportController'
      )
    ),
    (
      'apps/web/src/app/ports/dbtProjectImport.ts',
      'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
      jsonb_build_array('ValidateDbtProjectImport', 'ImportDbtProject'),
      jsonb_build_array('Separated Interface', 'Remote Facade'),
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'not_applicable:web_port',
      jsonb_build_array('apps/web/src/app/services/dbtProject/dbtProjectImport.api.test.ts'),
      jsonb_build_array('IDbtProjectImportPort')
    ),
    (
      'apps/web/src/app/services/AppServicesContext.tsx',
      'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
      jsonb_build_array('ValidateDbtProjectImport', 'ImportDbtProject'),
      jsonb_build_array('Registry', 'Composition'),
      'pnpm --filter @dvt/web exec vitest run src/app/services/AppServicesContext.test.tsx',
      'not_applicable:service_context',
      jsonb_build_array('apps/web/src/app/services/AppServicesContext.test.tsx'),
      jsonb_build_array('useDbtProjectImportPort')
    ),
    (
      'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts',
      'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
      jsonb_build_array('ValidateDbtProjectImport', 'ImportDbtProject'),
      jsonb_build_array('Remote Facade', 'Gateway'),
      'pnpm --filter @dvt/web exec vitest run src/app/services/dbtProject/dbtProjectImport.api.test.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array('apps/web/src/app/services/dbtProject/dbtProjectImport.api.test.ts'),
      jsonb_build_array(
        'DBT_PROJECT_IMPORT_ENDPOINT',
        'DBT_PROJECT_IMPORT_VALIDATE_ENDPOINT',
        'buildScopedEndpoint',
        'createApiDbtProjectImportPort'
      )
    ),
    (
      'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts',
      'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
      jsonb_build_array('ImportDbtProject', 'ImportWarehouseSources'),
      jsonb_build_array('Identity Field', 'Factory'),
      'pnpm --filter @dvt/web exec vitest run src/app/services/idempotency/createBrowserIdempotencyKey.test.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.test.ts'
      ),
      jsonb_build_array('createBrowserIdempotencyKey', 'createUuidFromRandomBytes')
    ),
    (
      'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx',
      'SYS-WEB-CANVAS-DBT-PROJECT-FILE-SURFACE',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'ImportWarehouseSources'),
      jsonb_build_array('Template View', 'Strategy'),
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.sourceImport.test.ts'
      ),
      jsonb_build_array('FILE_AUTHORITY_SOURCE_IMPORT_KINDS')
    ),
    (
      'apps/web/src/app/views/canvas/canvasRouteAuthority.ts',
      'SYS-WEB-CANVAS-ROUTE-AUTHORITY',
      jsonb_build_array('ImportDbtProject', 'ProjectDbtGraphFromFiles'),
      jsonb_build_array('Value Object', 'Mapper'),
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasRouteAuthority.test.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/canvasRouteAuthority.test.ts'),
      jsonb_build_array('buildDbtProjectFileCanvasPath')
    ),
    (
      'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts',
      'SYS-WEB-CANVAS-DBT-PROJECT-FILE-SURFACE-CONTROLLER',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'ImportWarehouseSources'),
      jsonb_build_array('Supervising Controller', 'Strategy'),
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useDbtProjectFileCanvasController.sourceImport.test.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.sourceImport.test.ts'
      ),
      jsonb_build_array('resolveDbtProjectFileSourceImportFocus')
    ),
    (
      'scripts/run-selected-closure-live-proof.cjs',
      'SYS-DEVEX-SELECTED-CLOSURE-LIVE-PROOF',
      jsonb_build_array(
        'ValidateDbtProjectImport',
        'ImportDbtProject',
        'ImportWarehouseSources',
        'ProjectDbtGraphFromFiles'
      ),
      jsonb_build_array('Test Harness', 'Gateway'),
      'node --test scripts/run-selected-closure-live-proof.test.cjs',
      'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      jsonb_build_array('scripts/run-selected-closure-live-proof.test.cjs'),
      jsonb_build_array('CYPRESS_IMAGE', 'buildLiveProofCypressDockerInvocation')
    )
), desired_symbol as (
  select
    jsonb_build_object(
      'name', symbol_name.value,
      'path', symbol_group.file_path,
      'dddOwner', symbol_group.ddd_owner,
      'cqRails', symbol_group.cq_rails,
      'fowlerSignals', symbol_group.fowler_signals,
      'architectureGuard', symbol_group.architecture_guard,
      'cypressCoverage', symbol_group.cypress_coverage,
      'unitTests', symbol_group.unit_tests
    ) as item,
    symbol_group.file_path as path,
    symbol_name.value as name
  from phase3_symbol_group symbol_group
  cross join lateral jsonb_array_elements_text(symbol_group.symbol_names) symbol_name(value)
), reconciled_symbol as (
  select distinct on (path, name) item, path, name
  from (
    select existing_symbol.item, existing_symbol.path, existing_symbol.name, 0 as priority
    from existing_symbol
    union all
    select desired_symbol.item, desired_symbol.path, desired_symbol.name, 1 as priority
    from desired_symbol
  ) candidate
  order by path, name, priority desc
), partitioned_symbol as (
  select
    case
      when coalesce(item -> 'cqRails', '[]'::jsonb) ? 'ValidateDbtProjectImport'
        then 'ValidateDbtProjectImport'
      else 'ImportDbtProject'
    end as rail_name,
    item,
    path,
    name
  from reconciled_symbol
), rail_symbol_manifest as (
  select
    target_rail.rail_id,
    target_rail.rail_name,
    coalesce(
      jsonb_agg(partitioned_symbol.item order by partitioned_symbol.path, partitioned_symbol.name)
        filter (where partitioned_symbol.item is not null),
      '[]'::jsonb
    ) as symbols
  from target_rail
  left join partitioned_symbol on partitioned_symbol.rail_name = target_rail.rail_name
  group by target_rail.rail_id, target_rail.rail_name
), rail_surface_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)
          || jsonb_build_array(
            'apps/web/scripts/run-cypress-docker.mjs',
            'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts',
            'tools/planning-db/migrations/696_dbt_project_import_phase3_feature_manifest_closeout.sql'
          )
        ) surface(item)
        where item #>> '{}' not in (
          'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts',
          'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts'
        )
      ) distinct_surface
    ) as surfaces
  from target_rail
), rail_implementation_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(target_rail.implementation_refs, '[]'::jsonb)
          || jsonb_build_array(
            'apps/api/src/application/ports/dbtProjectImport.ts',
            'apps/api/src/application/ports/workspaceFiles.ts',
            'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts',
            'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts',
            'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
            'apps/web/cypress/support/liveWarehouseSourceImport.ts',
            'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx',
            'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx',
            'apps/web/src/app/components/dbtProjectImport/dbtProjectImportPresentationModel.ts',
            'apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts',
            'apps/web/src/app/ports/dbtProjectImport.ts',
            'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts',
            'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts',
            'scripts/run-selected-closure-live-proof.cjs',
            'tools/planning-db/migrations/696_dbt_project_import_phase3_feature_manifest_closeout.sql'
          )
        ) implementation(item)
        where item #>> '{}' not in (
          'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts',
          'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts'
        )
      ) distinct_implementation
    ) as implementation_refs
  from target_rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = (
    select jsonb_agg(
      to_jsonb((symbol.item ->> 'path') || '#' || (symbol.item ->> 'name'))
      order by symbol.item ->> 'path', symbol.item ->> 'name'
    )
    from jsonb_array_elements(rail_symbol_manifest.symbols) symbol(item)
  ),
  implementation_refs = rail_implementation_manifest.implementation_refs,
  allowed_implementation_surfaces = rail_surface_manifest.surfaces,
  completion_gate = coalesce(rail.completion_gate, '[]'::jsonb) || jsonb_build_array(
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/696_dbt_project_import_phase3_feature_manifest_closeout.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':phase3-feature-closeout:696'), 2),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'phase3FeatureManifestClosedBy',
    '696_dbt_project_import_phase3_feature_manifest_closeout'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            rail.raw_manifest || jsonb_build_object(
              'currentImplementationSourcePath',
              'tools/planning-db/migrations/696_dbt_project_import_phase3_feature_manifest_closeout.sql'
            ),
            '{symbols}',
            rail_symbol_manifest.symbols,
            true
          ),
          '{allowedImplementationSurfaces}',
          rail_surface_manifest.surfaces,
          true
        ),
        '{cypressFlows}',
        coalesce(rail.raw_manifest -> 'cypressFlows', '[]'::jsonb)
          || jsonb_build_array(
            'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'
          ),
        true
      ),
      '{completionGate}',
      coalesce(rail.raw_manifest -> 'completionGate', '[]'::jsonb)
        || jsonb_build_array(
          'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'
        ),
      true
    ),
    '{redGreenCycles}',
    coalesce(rail.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'id', 'phase3-crash-safe-protected-browser-import',
          'redTest', 'pnpm docs:feature-mechanization:implementation',
          'expectedFailure', 'The receipt-only process could strand Canvas authority after a crash and the protected browser surface had no strict end-to-end proof.',
          'patchSurfaces', jsonb_build_array(
            'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts',
            'apps/web/src/app/components/dbtProjectImport/**',
            'apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'
          ),
          'greenTest', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts'
        )
      ),
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from rail_symbol_manifest
join rail_surface_manifest using (rail_id)
join rail_implementation_manifest using (rail_id)
where rail.rail_id = rail_symbol_manifest.rail_id;

do $$
declare
  target_rail_count integer;
  desired_symbol_count integer;
  actual_desired_symbol_count integer;
begin
  select count(*) into target_rail_count
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
    and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
    and rail.source_path = 'tools/planning-db/migrations/696_dbt_project_import_phase3_feature_manifest_closeout.sql';

  with desired(path, names) as (
    values
      ('apps/api/src/application/ports/dbtProjectImport.ts', array['IDbtProjectImportProcessStore']),
      ('apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts', array['PostgresDbtProjectImportProcessStore']),
      ('apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx', array['DbtProjectImportDialogView']),
      ('apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts', array['createBrowserIdempotencyKey'])
  ), expected as (
    select path, unnest(names) as name from desired
  ), actual as (
    select symbol.item ->> 'path' as path, symbol.item ->> 'name' as name
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements(rail.raw_manifest -> 'symbols') symbol(item)
    where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
      and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
  )
  select
    (select count(*) from expected),
    (select count(*) from expected join actual using (path, name))
  into desired_symbol_count, actual_desired_symbol_count;

  if target_rail_count <> 2 then
    raise exception 'Phase 3 feature closeout requires two canonical rails, found %', target_rail_count;
  end if;

  if desired_symbol_count <> actual_desired_symbol_count then
    raise exception 'Phase 3 feature closeout is missing representative symbols: expected %, found %', desired_symbol_count, actual_desired_symbol_count;
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
      and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
      and rail.raw_manifest::text like '%PostgresDbtProjectImportReceiptStore%'
  ) then
    raise exception 'Receipt-only dbt import symbols or tests remain in the active feature manifest';
  end if;
end $$;
