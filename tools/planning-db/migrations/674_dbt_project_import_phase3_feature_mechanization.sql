-- Replace the reactivated historical manifests with the complete phase-three
-- server mechanization. The two product rails remain canonical; shared source
-- import and projection behavior references their existing rails instead of
-- creating phase-specific aliases.

with symbol_group (
  path,
  ddd_owner,
  cq_rails,
  fowler_signals,
  architecture_guard,
  cypress_coverage,
  unit_tests,
  symbols
) as (
  values
    (
      'apps/api/src/application/ports/canvasAuthoringAuthority.ts',
      'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Separated Interface', 'Published Language']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:server_authority_port_is_exercised_through_protected_route_and_application_tests',
      array['apps/api/test/application/canvasAuthoringAuthorityPolicy.test.ts']::text[],
      array[
        'CanvasAuthoringAuthorityBindResult',
        'CanvasAuthoringAuthorityKey',
        'CanvasAuthoringAuthorityReleaseResult',
        'CanvasAuthoringAuthorityStoredRecord',
        'ICanvasAuthoringAuthorityStore'
      ]::text[]
    ),
    (
      'apps/api/src/application/ports/dbtProjectImport.ts',
      'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
      array['ValidateDbtProjectImport', 'ImportDbtProject']::text[],
      array['Separated Interface', 'Service Layer']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:strict_browser_import_remains_owned_by_the_proposed_web_component',
      array['apps/api/test/application/dbtProjectImportUseCases.test.ts']::text[],
      array[
        'DbtProjectFileAuthorityRequiredError',
        'DbtProjectImportAuthorityConflictError',
        'DbtProjectImportCanvasOccupiedError',
        'DbtProjectImportIdempotencyMismatchError',
        'DbtProjectImportInspection',
        'DbtProjectImportProjectionError',
        'DbtProjectImportRejectedError',
        'DbtProjectImportStaleReceiptError',
        'IDbtProjectImportInspectorPort',
        'InspectDbtProjectImportInput'
      ]::text[]
    ),
    (
      'apps/api/src/application/ports/warehouseSourceImport.ts',
      'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
      array['ImportWarehouseSources']::text[],
      array['Separated Interface', 'Service Layer']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts']::text[],
      array['WarehouseSourceImportIdempotencyMismatchError']::text[]
    ),
    (
      'apps/api/src/application/ports/workspaceFiles.ts',
      'SYS-API-APPLICATION-PORTS',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Separated Interface', 'Unit of Work']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts']::text[],
      array[
        'IWorkspaceFileBatchMutationPort',
        'InvalidWorkspaceFileBatchMutationError',
        'InvalidWorkspaceFileBatchReceiptError',
        'WorkspaceFileBatchExpectedFile',
        'WorkspaceFileBatchIdempotencyConflictError',
        'WorkspaceFileBatchMutation',
        'WorkspaceFileBatchMutationResult',
        'WorkspaceFileBatchReceipt',
        'WorkspaceFileBatchWrite'
      ]::text[]
    ),
    (
      'apps/api/src/application/services/canvasAuthoringAuthorityPolicy.ts',
      'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Service Layer', 'Policy']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:server_authority_policy_is_exercised_through_application_tests',
      array['apps/api/test/application/canvasAuthoringAuthorityPolicy.test.ts']::text[],
      array['CanvasAuthoringAuthorityPolicy']::text[]
    ),
    (
      'apps/api/src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.ts',
      'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
      array['ImportWarehouseSources', 'ProjectDbtGraphFromFiles']::text[],
      array['Strategy', 'Service Layer']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts']::text[],
      array[
        'DbtProjectFilesAuthorityBinding',
        'DbtProjectFilesWarehouseSourceImportStrategy',
        'WarehouseSourceImportProjectionError',
        'verifyProjection'
      ]::text[]
    ),
    (
      'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts',
      'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
      array['ImportWarehouseSources']::text[],
      array['Strategy', 'Service Layer']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts']::text[],
      array[
        'GraphDraftWarehouseSourceImportStrategy',
        'WarehouseSourceImportCanvasNotFoundError',
        'appendImportedSourceNodes',
        'assertTargetCanvas',
        'createInitialDraft',
        'hasTargetCanvas',
        'readSourceObjectId',
        'readTargetCanvas',
        'sha256',
        'toCollisionResistantSourceNodeId',
        'toSourceNode',
        'toStableSourceNodeId'
      ]::text[]
    ),
    (
      'apps/api/src/application/services/importDbtProjectUseCase.ts',
      'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
      array['ImportDbtProject']::text[],
      array['Service Layer', 'Unit of Work']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:strict_browser_import_remains_owned_by_the_proposed_web_component',
      array['apps/api/test/application/dbtProjectImportUseCases.test.ts']::text[],
      array['ImportDbtProjectUseCase', 'sameReceipt', 'sha256']::text[]
    ),
    (
      'apps/api/src/application/services/validateDbtProjectImportUseCase.ts',
      'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
      array['ValidateDbtProjectImport']::text[],
      array['Service Layer', 'Query Object']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:strict_browser_import_remains_owned_by_the_proposed_web_component',
      array['apps/api/test/application/dbtProjectImportUseCases.test.ts']::text[],
      array['ValidateDbtProjectImportUseCase', 'analysisDiagnostic', 'sha256']::text[]
    ),
    (
      'apps/api/src/application/services/warehouseSourceImportPlan.ts',
      'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
      array['ImportWarehouseSources']::text[],
      array['Service Layer', 'Unit of Work']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts']::text[],
      array[
        'WarehouseSourceImportCommandContext',
        'WarehouseSourceImportFilePlan',
        'WarehouseSourceImportStrategyResult',
        'applyWarehouseSourceImportFilePlan',
        'buildWarehouseSourceImportFilePlan',
        'rollbackWarehouseSourceImportFilePlan',
        'toAuthorityPath'
      ]::text[]
    ),
    (
      'apps/api/src/entrypoints/http/dbtProjectImportRouteGroup.ts',
      'SYS-API-HTTP-WORKSPACE-ROUTES',
      array['ValidateDbtProjectImport', 'ImportDbtProject']::text[],
      array['Remote Facade', 'Controller']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:strict_browser_import_remains_owned_by_the_proposed_web_component',
      array['apps/api/test/entrypoints/http/dbtProjectImportRoutes.test.ts']::text[],
      array['registerProtectedDbtProjectImportRouteGroup']::text[]
    ),
    (
      'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts',
      'SYS-API-HTTP-WORKSPACE-ROUTES',
      array['ValidateDbtProjectImport', 'ImportDbtProject']::text[],
      array['Remote Facade', 'Controller']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:strict_browser_import_remains_owned_by_the_proposed_web_component',
      array['apps/api/test/entrypoints/http/dbtProjectImportRoutes.test.ts']::text[],
      array[
        'DbtProjectImportQuery',
        'DbtProjectImportRouteDeps',
        'authorizeImportRequest',
        'mapImportError',
        'parseScope',
        'registerDbtProjectImportRoutes',
        'respondImportError',
        'respondInvalidRequest'
      ]::text[]
    ),
    (
      'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts',
      'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Repository', 'Data Mapper']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:persistence_adapter_is_exercised_by_postgres_adapter_tests',
      array['apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts']::text[],
      array[
        'AuthorityRow',
        'Config',
        'IdempotencyRow',
        'PostgresCanvasAuthoringAuthorityStore',
        'asIsoString',
        'assertBindingKey',
        'keyValues',
        'mapAuthorityRow',
        'mapIdempotencyRow',
        'quoteIdentifier',
        'rollbackPreservingError',
        'withTimeout'
      ]::text[]
    ),
    (
      'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts',
      'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
      array['ValidateDbtProjectImport']::text[],
      array['Gateway', 'Data Mapper']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:filesystem_inspector_is_exercised_by_boundary_tests',
      array['apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts']::text[],
      array[
        'DEPENDENCY_FILE_NAMES',
        'LocalDbtProjectImportInspector',
        'Options',
        'ProjectLimitError',
        'RUNTIME_DIRECTORIES',
        'SECRET_FILE_NAMES',
        'ScanState',
        'boundaryDiagnostic',
        'buildInventory',
        'classifyFile',
        'emptyInventory',
        'isSecretFile',
        'readProjectName',
        'workspacePath'
      ]::text[]
    ),
    (
      'apps/api/src/infrastructure/dbt/dbtProjectWorkspaceBoundary.ts',
      'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
      array['ValidateDbtProjectImport', 'ImportDbtProject']::text[],
      array['Gateway', 'Special Case']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:filesystem_boundary_is_exercised_by_inspector_and_use_case_tests',
      array['apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts']::text[],
      array[
        'DbtProjectBoundaryError',
        'DbtProjectBoundaryFailure',
        'assertContained',
        'resolveDbtProjectDirectory'
      ]::text[]
    ),
    (
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts',
      'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Gateway', 'Unit of Work']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts']::text[],
      array[
        'LocalWorkspaceFileBatchMutationGateway',
        'LocalWorkspaceFileBatchMutationGatewayOptions',
        'MAX_BATCH_BYTES',
        'MAX_BATCH_FILES',
        'MAX_FILE_BYTES',
        'buildBatchEntries',
        'isFileNotFound',
        'readCurrentRevisions',
        'readOptionalSha256'
      ]::text[]
    ),
    (
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts',
      'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Unit of Work', 'Gateway']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.test.ts']::text[],
      array['LocalWorkspaceFileBatchEntry']::text[]
    ),
    (
      'apps/api/src/infrastructure/workspaceFiles/localWorkspaceFileBatchMutationModel.ts',
      'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Unit of Work', 'Data Mapper']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts']::text[],
      array[
        'MAX_IDEMPOTENCY_KEY_LENGTH',
        'ResolvedWorkspaceFileBatchExpectedFile',
        'ResolvedWorkspaceFileBatchMutation',
        'ResolvedWorkspaceFileBatchWrite',
        'SHA256_PATTERN',
        'StoredWorkspaceFileBatchReceipt',
        'assertUniquePaths',
        'buildStoredWorkspaceFileBatchReceipt',
        'hashLocalWorkspaceFileBatchRequest',
        'isStoredWorkspaceFileBatchReceipt',
        'isStoredWriteReceipt',
        'parseStoredWorkspaceFileBatchReceipt',
        'resolveLocalWorkspaceFileBatchMutation',
        'sortByWorkspacePath',
        'toWorkspaceFileBatchReceipt',
        'uniqueReceiptPaths',
        'workspaceFileBatchPostconditionsMatch',
        'workspaceFileBatchSha256'
      ]::text[]
    ),
    (
      'apps/api/src/infrastructure/workspaceFiles/workspaceScopeStoragePath.ts',
      'SYS-API-INFRA-WORKSPACE-FILES',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Gateway', 'Value Object']::text[],
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts']::text[],
      array[
        'ALLOWED_WORKSPACE_FILE_EXTENSIONS',
        'isAllowedWorkspaceFileName',
        'resolveWorkspaceFileStoragePath'
      ]::text[]
    ),
    (
      'apps/api/src/modules/canvasAuthoringAuthority/buildCanvasAuthoringAuthorityRuntime.ts',
      'SYS-API-RUNTIME-CANVAS-AUTHORITY',
      array['ImportDbtProject', 'ImportWarehouseSources']::text[],
      array['Registry', 'Dependency Injection']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:composition_root_has_no_browser_semantics',
      array['apps/api/test/modules/buildDbtProjectImportRuntime.test.ts']::text[],
      array['buildCanvasAuthoringAuthorityRuntime']::text[]
    ),
    (
      'apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts',
      'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
      array['ValidateDbtProjectImport', 'ImportDbtProject']::text[],
      array['Registry', 'Dependency Injection']::text[],
      'pnpm --filter dvt-api test:arch',
      'not_applicable:composition_root_has_no_browser_semantics',
      array['apps/api/test/modules/buildDbtProjectImportRuntime.test.ts']::text[],
      array[
        'BuildDbtProjectImportRuntimeDeps',
        'DbtProjectImportRuntime',
        'buildDbtProjectImportRuntime'
      ]::text[]
    ),
    (
      'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts',
      'SYS-CONTRACTS-DBT-PROJECT-IMPORT',
      array['ValidateDbtProjectImport', 'ImportDbtProject']::text[],
      array['Published Language', 'Data Transfer Object']::text[],
      'pnpm --filter @dvt/contracts test',
      'not_applicable:strict_browser_import_remains_owned_by_the_proposed_web_component',
      array['packages/@dvt/contracts/test/dbt-project-import.contract.test.ts']::text[],
      array[
        'AcceptedDbtProjectImportValidationReportSchema',
        'DBT_PROJECT_IMPORT_DIAGNOSTIC_CODE',
        'DBT_PROJECT_IMPORT_FILE_CLASSIFICATION',
        'DbtProjectImportCommand',
        'DbtProjectImportCommandSchema',
        'DbtProjectImportDiagnostic',
        'DbtProjectImportDiagnosticCode',
        'DbtProjectImportDiagnosticSchema',
        'DbtProjectImportFile',
        'DbtProjectImportFileClassification',
        'DbtProjectImportFileSchema',
        'DbtProjectImportInventory',
        'DbtProjectImportInventorySchema',
        'DbtProjectImportResult',
        'DbtProjectImportResultSchema',
        'DbtProjectImportValidationReceipt',
        'DbtProjectImportValidationReceiptSchema',
        'DbtProjectImportValidationReport',
        'DbtProjectImportValidationReportSchema',
        'ExcludedProjectFileSchema',
        'IncludedProjectFileSchema',
        'IsoUtcStringSchema',
        'NonBlankStringSchema',
        'NonNegativeSafeIntegerSchema',
        'PositiveSafeIntegerSchema',
        'RejectedDbtProjectImportValidationReportSchema',
        'Sha256HexStringSchema',
        'ValidateDbtProjectImportRequest',
        'ValidateDbtProjectImportRequestSchema',
        'WorkspaceRelativeFilePathSchema'
      ]::text[]
    ),
    (
      'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts',
      'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING',
      array['ProjectDbtGraphFromFiles']::text[],
      array['Published Language', 'Data Transfer Object']::text[],
      'pnpm --filter @dvt/contracts test',
      'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      array['packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts']::text[],
      array['DbtProjectRevision']::text[]
    ),
    (
      'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts',
      'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS',
      array['ImportWarehouseSources']::text[],
      array['Published Language', 'Data Transfer Object']::text[],
      'pnpm --filter @dvt/contracts test',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array['packages/@dvt/contracts/test/source-import/SourceImportOperations.v2.test.ts']::text[],
      array[
        'DbtProjectFilesSourceImportOutcomeSchema',
        'GraphDraftSourceImportOutcomeSchema',
        'ImportSourceObjectsRequestV2',
        'ImportSourceObjectsRequestV2Schema',
        'ImportSourceObjectsResultV2',
        'ImportSourceObjectsResultV2Schema',
        'NonBlankStringSchema',
        'PositiveSafeIntegerSchema',
        'Sha256HexStringSchema',
        'UniqueNonBlankStringListSchema'
      ]::text[]
    )
),
declared_symbol as (
  select
    path,
    ddd_owner,
    cq_rails,
    fowler_signals,
    architecture_guard,
    cypress_coverage,
    unit_tests,
    unnest(symbols) as name
  from symbol_group
),
symbol_manifest as (
  select
    jsonb_agg(
      jsonb_build_object(
        'name', name,
        'path', path,
        'dddOwner', ddd_owner,
        'cqRails', to_jsonb(cq_rails),
        'fowlerSignals', to_jsonb(fowler_signals),
        'architectureGuard', architecture_guard,
        'cypressCoverage', cypress_coverage,
        'unitTests', to_jsonb(unit_tests)
      ) order by path, name
    ) as symbols,
    jsonb_agg(to_jsonb(path || '#' || name) order by path, name) as symbol_refs
  from declared_symbol
),
manifest_data as (
  select
    symbol_manifest.symbols,
    symbol_manifest.symbol_refs,
    jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/dbt-project/**',
      'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts',
      'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts',
      'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts',
      'packages/@dvt/contracts/test/dbt-project-import.contract.test.ts',
      'packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts',
      'packages/@dvt/contracts/test/source-import/SourceImportOperations.v2.test.ts',
      'apps/api/src/application/ports/canvasAuthoringAuthority.ts',
      'apps/api/src/application/ports/dbtProjectImport.ts',
      'apps/api/src/application/ports/warehouseSourceImport.ts',
      'apps/api/src/application/ports/workspaceFiles.ts',
      'apps/api/src/application/services/canvasAuthoringAuthorityPolicy.ts',
      'apps/api/src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.ts',
      'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts',
      'apps/api/src/application/services/importDbtProjectUseCase.ts',
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
      'apps/api/src/application/services/validateDbtProjectImportUseCase.ts',
      'apps/api/src/application/services/warehouseSourceImportPlan.ts',
      'apps/api/src/entrypoints/http/dbtProjectImportRouteGroup.ts',
      'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts',
      'apps/api/src/infrastructure/canvasAuthoringAuthority/**',
      'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts',
      'apps/api/src/infrastructure/dbt/dbtProjectWorkspaceBoundary.ts',
      'apps/api/src/infrastructure/workspaceFiles/**',
      'apps/api/src/modules/canvasAuthoringAuthority/**',
      'apps/api/src/modules/dbtProjectImport/**',
      'apps/api/test/application/canvasAuthoringAuthorityPolicy.test.ts',
      'apps/api/test/application/dbtProjectImportUseCases.test.ts',
      'apps/api/test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts',
      'apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts',
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/api/test/entrypoints/http/dbtProjectImportRoutes.test.ts',
      'apps/api/test/infrastructure/canvasAuthoringAuthority/**',
      'apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts',
      'apps/api/test/infrastructure/workspaceFiles/**',
      'apps/api/test/modules/buildDbtProjectImportRuntime.test.ts',
      'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
      'docs/evidence/ED-20260714-dbt-project-import-phase3-runtime.md',
      'docs/risk-register/quality/R-20260714-DBT-PROJECT-IMPORT-AUTHORITY.yaml',
      'tools/planning-db/migrations/663_dbt_project_import_phase3_design.sql',
      'tools/planning-db/migrations/664_dbt_project_import_phase3_contracts.sql',
      'tools/planning-db/migrations/665_canvas_authoring_authority_component_separation.sql',
      'tools/planning-db/migrations/666_dbt_project_import_application_ownership.sql',
      'tools/planning-db/migrations/667_dbt_project_import_runtime_design.sql',
      'tools/planning-db/migrations/668_workspace_file_batch_mutation_gateway.sql',
      'tools/planning-db/migrations/669_workspace_file_batch_mutation_model_ownership.sql',
      'tools/planning-db/migrations/670_authority_aware_warehouse_source_import_components.sql',
      'tools/planning-db/migrations/671_authority_aware_source_import_implementation_closeout.sql',
      'tools/planning-db/migrations/672_dbt_project_import_phase3_web_design.sql',
      'tools/planning-db/migrations/673_dbt_project_import_planned_web_integrity.sql',
      'tools/planning-db/migrations/674_dbt_project_import_phase3_feature_mechanization.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'Validation is a read-only query and project import is an explicit command.',
      'Canvas authoring authority is persisted server-side and never accepted from the browser.',
      'Workspace file batches are atomic, idempotent, bounded, and revision checked.',
      'Source import selects one strategy from persisted Canvas authority and cannot fall back silently.',
      'The browser import component remains proposed until strict Cypress evidence exercises the protected API.'
    ) as architecture_guards,
    jsonb_build_array(
      'pnpm --filter @dvt/contracts test',
      'pnpm --filter @dvt/contracts typecheck',
      'pnpm --filter dvt-api test',
      'pnpm --filter dvt-api test:arch',
      'pnpm --filter dvt-api typecheck',
      'pnpm --filter dvt-api lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ) as completion_gate
  from symbol_manifest
),
complete_manifest as (
  select
    manifest_data.*,
    jsonb_build_object(
      'version', 1,
      'featureId', 'E-DBT-PROJECT-ROUNDTRIP-1',
      'mechanizationStatus', 'implemented',
      'noHumanDecisionsRemaining', true,
      'implementationPlan', 'Implement the governed phase-three server foundation for dbt project validation/import and authority-aware source import. Keep the proposed browser component open until it consumes these protected rails with strict Cypress evidence.',
      'componentGuides', jsonb_build_array(
        'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md'
      ),
      'userStories', jsonb_build_array(
        'A workspace editor can validate a dbt project without mutating files or Canvas authority.',
        'A workspace editor can import an accepted dbt project exactly once into an unbound Canvas.',
        'Source import writes either graph draft state or dbt project files according to persisted Canvas authority.'
      ),
      'governingSources', jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/architecture/fowler-opportunity-planning-governance.md',
        'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
        'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md'
      ),
      'allowedImplementationSurfaces', manifest_data.allowed_surfaces,
      'forbiddenImplementationSurfaces', jsonb_build_array(
        'buzon/**',
        'docs/planning/state/agent-lane-*.yaml'
      ),
      'domainObjects', jsonb_build_array(
        'CanvasAuthoringAuthorityBinding',
        'DbtProjectImportValidationReport',
        'DbtProjectImportValidationReceipt',
        'WorkspaceFileBatchMutation',
        'ImportSourceObjectsRequestV2',
        'DbtProjectGraphProjection'
      ),
      'fowlerSignals', jsonb_build_array(
        'Published Language',
        'Service Layer',
        'Separated Interface',
        'Strategy',
        'Repository',
        'Unit of Work',
        'Remote Facade'
      ),
      'architectureGuards', manifest_data.architecture_guards,
      'cypressFlows', jsonb_build_array(
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'
      ),
      'completionGate', manifest_data.completion_gate,
      'commandQueryRails', jsonb_build_array(
        jsonb_build_object('name', 'ValidateDbtProjectImport', 'type', 'query', 'dddOwner', 'DbtProjectImportValidationReport'),
        jsonb_build_object('name', 'ImportDbtProject', 'type', 'command', 'dddOwner', 'CanvasAuthoringAuthorityBinding'),
        jsonb_build_object('name', 'ImportWarehouseSources', 'type', 'command', 'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'),
        jsonb_build_object('name', 'ProjectDbtGraphFromFiles', 'type', 'query', 'dddOwner', 'DbtProjectGraphProjection')
      ),
      'redGreenCycles', jsonb_build_array(
        jsonb_build_object(
          'id', 'phase3-contracts',
          'redTest', 'pnpm --filter @dvt/contracts test',
          'expectedFailure', 'The published language rejected authority-free import commands and inconsistent inventories before the contracts existed.',
          'patchSurfaces', jsonb_build_array('packages/@dvt/contracts/src/contracts/dbt-project/**', 'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts'),
          'greenTest', 'pnpm --filter @dvt/contracts test'
        ),
        jsonb_build_object(
          'id', 'phase3-import-service',
          'redTest', 'pnpm --filter dvt-api exec vitest run test/application/dbtProjectImportUseCases.test.ts test/entrypoints/http/dbtProjectImportRoutes.test.ts',
          'expectedFailure', 'Validation and import lacked protected, idempotent application and HTTP rails.',
          'patchSurfaces', jsonb_build_array('apps/api/src/application/services/*DbtProjectImportUseCase.ts', 'apps/api/src/entrypoints/http/dbtProjectImport*.ts'),
          'greenTest', 'pnpm --filter dvt-api exec vitest run test/application/dbtProjectImportUseCases.test.ts test/entrypoints/http/dbtProjectImportRoutes.test.ts'
        ),
        jsonb_build_object(
          'id', 'phase3-atomic-workspace-batch',
          'redTest', 'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts',
          'expectedFailure', 'Multi-file publication could expose partial writes and could not replay an idempotent receipt.',
          'patchSurfaces', jsonb_build_array('apps/api/src/application/ports/workspaceFiles.ts', 'apps/api/src/infrastructure/workspaceFiles/**'),
          'greenTest', 'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts'
        ),
        jsonb_build_object(
          'id', 'phase3-authority-aware-source-import',
          'redTest', 'pnpm --filter dvt-api exec vitest run test/application/services/importWarehouseSourcesUseCase.test.ts test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts',
          'expectedFailure', 'Source import could mutate the wrong persistence authority or leave a partial dbt YAML projection.',
          'patchSurfaces', jsonb_build_array('apps/api/src/application/services/*WarehouseSourceImport*.ts', 'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts'),
          'greenTest', 'pnpm --filter dvt-api exec vitest run test/application/services/importWarehouseSourcesUseCase.test.ts test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts'
        )
      ),
      'symbols', manifest_data.symbols
    ) as manifest
  from manifest_data
)
update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'implemented',
  ddd_owner = case rail.rail_name
    when 'ValidateDbtProjectImport' then 'DbtProjectImportValidationReport'
    else 'CanvasAuthoringAuthorityBinding'
  end,
  rail_status = 'implemented',
  symbol_refs = complete_manifest.symbol_refs,
  implementation_refs = complete_manifest.allowed_surfaces,
  documentation_refs = jsonb_build_array(
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
    'docs/evidence/ED-20260714-dbt-project-import-phase3-runtime.md',
    'docs/risk-register/quality/R-20260714-DBT-PROJECT-IMPORT-AUTHORITY.yaml'
  ),
  governing_sources = complete_manifest.manifest -> 'governingSources',
  allowed_implementation_surfaces = complete_manifest.allowed_surfaces,
  architecture_guards = complete_manifest.architecture_guards,
  completion_gate = complete_manifest.completion_gate,
  source_path = 'tools/planning-db/migrations/674_dbt_project_import_phase3_feature_mechanization.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':phase3-feature-mechanization:674'), 2),
  raw_rail = jsonb_build_object(
    'name', rail.rail_name,
    'type', rail.rail_type,
    'dddOwner', case rail.rail_name
      when 'ValidateDbtProjectImport' then 'DbtProjectImportValidationReport'
      else 'CanvasAuthoringAuthorityBinding'
    end,
    'status', 'implemented',
    'implementation', case rail.rail_name
      when 'ValidateDbtProjectImport' then 'Validate project boundaries and produce a content-addressed receipt without mutation.'
      else 'Bind an unbound Canvas to dbt-project-files authority and publish accepted project files atomically.'
    end
  ),
  raw_manifest = complete_manifest.manifest,
  revision = rail.revision + 1,
  updated_at = now()
from complete_manifest
where rail.rail_id in (
  'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport',
  'local#frontend-gap-rail-reconciliation-20260619#command#importdbtproject'
);
