-- Reconcile the aggregate dbt project round-trip feature with the completed
-- Phase 4 file-authoritative Preview/Run vertical. The feature reuses the
-- canonical execution rails; this migration does not create a parallel rail.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
    and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
), existing_symbol as (
  select distinct on (path, name)
    symbol.item,
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
  order by path, name, rail.rail_name
), phase4_symbol_group(
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
      'apps/api/src/application/ports/dbtExecutionTarget.ts',
      'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'StartRun'),
      jsonb_build_array('Separated Interface', 'Published Language'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts'),
      jsonb_build_array('IDbtExecutionTargetResolver')
    ),
    (
      'apps/api/src/application/ports/dbtProjectBundle.ts',
      'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE',
      jsonb_build_array('StartRun'),
      jsonb_build_array('Separated Interface', 'Published Language'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts'),
      jsonb_build_array('DbtProjectBundleBuildResult', 'IDbtProjectBundleBuilder')
    ),
    (
      'apps/api/src/application/ports/dbtRunExecutionContextWriter.ts',
      'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER',
      jsonb_build_array('StartRun'),
      jsonb_build_array('Separated Interface', 'Published Language'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts'),
      jsonb_build_array('DbtRunExecutionContextWriteResult', 'IDbtRunExecutionContextWriter')
    ),
    (
      'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts',
      'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
      jsonb_build_array('StartRun'),
      jsonb_build_array('Service Layer', 'Gateway'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array(
        'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts',
        'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts'
      ),
      jsonb_build_array(
        'CALLER_CONTEXT_REJECTION',
        'StoredPlanArtifactReader',
        'renderBundleFailure',
        'renderContextWriteFailure'
      )
    ),
    (
      'apps/api/src/application/services/dbtPlanExecutionBinding.ts',
      'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
      jsonb_build_array('StartRun'),
      jsonb_build_array('Value Object', 'Mapper'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/application/services/dbtPlanExecutionBinding.test.ts'),
      jsonb_build_array('DbtPlanExecutionBinding', 'resolveDbtPlanExecutionBinding', 'sameExecutionTarget')
    ),
    (
      'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts',
      'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
      jsonb_build_array('ProjectDbtGraphFromFiles'),
      jsonb_build_array('Service Layer', 'Mapper'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      jsonb_build_array('apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts'),
      jsonb_build_array('resolveExecutionDiagnostics')
    ),
    (
      'apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts',
      'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'PreviewExecutionPlan'),
      jsonb_build_array('Service Layer', 'Policy', 'Value Object'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts'),
      jsonb_build_array(
        'EXECUTABLE_RESOURCE',
        'PreviewSelectionInput',
        'PreviewSelectionRejection',
        'PreviewSelectionResolution',
        'ResolveAuthorizedPreviewSelectionService',
        'buildAuthoritativeGraph',
        'compareStrings',
        'findProvenanceMismatch',
        'normalizeGraphSource',
        'reject',
        'sameExecutionTarget',
        'sameGraphSource',
        'sameStringSet'
      )
    ),
    (
      'apps/api/src/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.ts',
      'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'StartRun'),
      jsonb_build_array('Gateway', 'Plugin'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts'),
      jsonb_build_array('ConfiguredDbtExecutionTarget', 'ConfiguredDbtExecutionTargetResolver')
    ),
    (
      'apps/api/src/infrastructure/dbt/DbtProjectBundleBuilder.ts',
      'SYS-API-INFRA-DBT-PROJECT-BUNDLE',
      jsonb_build_array('StartRun'),
      jsonb_build_array('Gateway', 'Repository'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts'),
      jsonb_build_array('DbtProjectBundleBuilder', 'isAlreadyExistsError', 'persistContentAddressedFile', 'writeAll')
    ),
    (
      'apps/api/src/infrastructure/dbt/FileDbtRunExecutionContextWriter.ts',
      'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES',
      jsonb_build_array('StartRun'),
      jsonb_build_array('Gateway', 'Repository'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts'),
      jsonb_build_array('FileDbtRunExecutionContextWriter', 'isAlreadyExistsError', 'writeAll', 'writeOnceOrVerify')
    ),
    (
      'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts',
      'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'StartRun'),
      jsonb_build_array('Value Object', 'Mapper'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/dbtProjectSourceSnapshot.test.ts'),
      jsonb_build_array('ProjectContentLimits', 'normalizeExcludedDirectoryNames')
    ),
    (
      'apps/api/src/infrastructure/dbt/dbtProjectSourceSnapshot.ts',
      'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'StartRun'),
      jsonb_build_array('Gateway', 'Value Object'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/dbtProjectSourceSnapshot.test.ts'),
      jsonb_build_array(
        'DBT_ROOT_SOURCE_FILES',
        'DBT_SOURCE_EXTENSIONS',
        'DEFAULT_DBT_PROJECT_SOURCE_LIMITS',
        'DbtProjectSourcePolicyError',
        'EXCLUDED_DIRECTORY_NAMES',
        'SENSITIVE_FILE_EXTENSION',
        'SENSITIVE_FILE_NAME',
        'isCanonicalDbtProjectSourceFile',
        'snapshotDbtProjectSource'
      )
    ),
    (
      'apps/api/src/infrastructure/dbt/dbtProjectTarArchive.ts',
      'SYS-API-INFRA-DBT-PROJECT-BUNDLE',
      jsonb_build_array('StartRun'),
      jsonb_build_array('Mapper', 'Gateway'),
      'pnpm --filter dvt-api test:arch',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts'),
      jsonb_build_array(
        'ArchiveFile',
        'TAR_BLOCK_SIZE',
        'createDbtProjectTarArchive',
        'createTarEntries',
        'createTarHeader',
        'gzipDeterministically',
        'listArchiveFiles',
        'padToTarBlock',
        'splitUstarPath',
        'writeTarOctal',
        'writeTarString'
      )
    ),
    (
      'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
      jsonb_build_array('ProjectDbtGraphFromFiles'),
      jsonb_build_array('Executable Specification', 'End-to-End Test'),
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      jsonb_build_array('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'),
      jsonb_build_array('INVALID_CANVAS_ID', 'INVALID_PROJECT_CONFIG')
    ),
    (
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
      jsonb_build_array('BuildDbtPlannerGraphSource', 'PreviewExecutionPlan', 'ObservePlanRunReadiness', 'StartRun'),
      jsonb_build_array('Executable Specification', 'End-to-End Test'),
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'),
      jsonb_build_array(
        'CANVAS_ID',
        'LiveRunEvents',
        'LiveRunSnapshot',
        'MODEL_UNIQUE_ID',
        'ObservedRequest',
        'PROJECT_FILES',
        'PROJECT_ROOT',
        'selectModelForExecution',
        'waitForCompletedDbtRun'
      )
    ),
    (
      'apps/web/cypress/support/dbtProjectLive.ts',
      'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'PreviewExecutionPlan', 'StartRun'),
      jsonb_build_array('Test Data Builder', 'Gateway'),
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'),
      jsonb_build_array(
        'AcceptedImportValidation',
        'WorkspaceFileRevision',
        'adoptLiveDbtProjectFileAuthority',
        'buildLiveAuthorization',
        'readRequiredEnv',
        'replaceLiveWorkspaceFile',
        'requestLiveDbtProjectGraph',
        'saveLiveWorkspaceFile',
        'seedLiveWorkspaceFiles'
      )
    ),
    (
      'apps/web/src/app/services/plans/plansService.api.ts',
      'SYS-WEB-SERVICES-PLANS',
      jsonb_build_array('PreviewExecutionPlan'),
      jsonb_build_array('Remote Facade', 'Mapper'),
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/web/src/app/services/plans/plansService.test.ts'),
      jsonb_build_array('parsePreviewProvenance')
    ),
    (
      'apps/web/src/app/stores/canvasInteractionStore.ts',
      'SYS-WEB-APP-STORES',
      jsonb_build_array('ObservePlanRunReadiness'),
      jsonb_build_array('Presentation Model', 'Identity Field'),
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/web/src/app/stores/canvasInteractionStore.test.ts'),
      jsonb_build_array('areSelectedNodeIdsEqual')
    ),
    (
      'apps/web/src/app/types/plans.ts',
      'SYS-WEB-APP-TYPES',
      jsonb_build_array('PreviewExecutionPlan', 'ObservePlanRunReadiness'),
      jsonb_build_array('Published Language', 'Data Transfer Object'),
      'pnpm --filter @dvt/web typecheck',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/web/src/app/services/plans/plansService.test.ts'),
      jsonb_build_array('PlanPreviewProvenanceViewModel')
    ),
    (
      'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts',
      'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
      jsonb_build_array('BuildDbtPlannerGraphSource', 'PreviewExecutionPlan', 'ObservePlanRunReadiness'),
      jsonb_build_array('Strategy', 'Presentation Model', 'Mapper'),
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts'),
      jsonb_build_array(
        'DbtProjectFileExecutionStrategy',
        'EXECUTABLE_RESOURCE',
        'buildDbtProjectFileExecutionDraftSignature',
        'buildDbtProjectFileExecutionStrategy',
        'buildDbtProjectFilePlannerProjection',
        'buildDbtProjectFilePreviewProvenance',
        'buildPlannerGraphSource',
        'compareStrings',
        'isDbtProjectFilePreviewProvenanceCurrent'
      )
    ),
    (
      'apps/web/src/app/views/canvas/useDbtProjectFileExecution.ts',
      'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
      jsonb_build_array('BuildDbtPlannerGraphSource', 'PreviewExecutionPlan', 'ObservePlanRunReadiness'),
      jsonb_build_array('Supervising Controller', 'Strategy'),
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts',
        'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts'
      ),
      jsonb_build_array('DbtProjectFileExecutionStore', 'useDbtProjectFileExecution')
    ),
    (
      'packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts',
      'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
      jsonb_build_array('PreviewExecutionPlan', 'StartRun'),
      jsonb_build_array('Published Language', 'Value Object'),
      'pnpm --filter @dvt/contracts schema:verify',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('packages/@dvt/contracts/test/plan-preview-provenance.contract.test.ts'),
      jsonb_build_array(
        'CredentialReferenceSchema',
        'DbtExecutionTargetIdentity',
        'DbtExecutionTargetIdentitySchema',
        'DbtProjectFilesProvenance',
        'DbtProjectFilesProvenanceSchema',
        'GitArtifactRef',
        'GitArtifactRefSchema',
        'NonBlankStringSchema',
        'PLAN_PREVIEW_PROVENANCE_KIND',
        'PlanPreviewProvenance',
        'PlanPreviewProvenanceSchema',
        'Sha256HexStringSchema',
        'TransformationGitArtifactsProvenance',
        'TransformationGitArtifactsProvenanceSchema'
      )
    ),
    (
      'packages/@dvt/contracts/src/schema-packs/plan-preview-profile.ts',
      'SYS-CONTRACTS-SCHEMA-PACKS',
      jsonb_build_array('PreviewExecutionPlan'),
      jsonb_build_array('Published Language', 'Gateway'),
      'pnpm --filter @dvt/contracts schema:verify',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('packages/@dvt/contracts/test/plan-preview-provenance.contract.test.ts'),
      jsonb_build_array('DesignGraphDraftSchema', 'PlanPreviewProvenanceSchema')
    ),
    (
      'scripts/run-dev-stack.cjs',
      'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'BuildDbtPlannerGraphSource', 'PreviewExecutionPlan', 'ObservePlanRunReadiness', 'StartRun'),
      jsonb_build_array('Test Harness', 'Gateway'),
      'node --test scripts/run-dev-stack.test.cjs',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('scripts/run-dev-stack.test.cjs'),
      jsonb_build_array('sendJsonCommand')
    ),
    (
      'scripts/run-selected-closure-live-proof.cjs',
      'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
      jsonb_build_array('ProjectDbtGraphFromFiles', 'BuildDbtPlannerGraphSource', 'PreviewExecutionPlan', 'ObservePlanRunReadiness', 'StartRun'),
      jsonb_build_array('Test Harness', 'Gateway'),
      'node --test scripts/run-selected-closure-live-proof.test.cjs',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      jsonb_build_array('scripts/run-selected-closure-live-proof.test.cjs'),
      jsonb_build_array('discoverLiveProofDbtExecutable', 'resolveLiveProofDbtExecutable')
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
  from phase4_symbol_group symbol_group
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
      when coalesce(item -> 'cqRails', '[]'::jsonb) ? 'StartRun'
        or coalesce(item -> 'cqRails', '[]'::jsonb) ? 'PreviewExecutionPlan'
        or coalesce(item -> 'cqRails', '[]'::jsonb) ? 'ImportDbtProject'
        then 'ImportDbtProject'
      else 'ValidateDbtProjectImport'
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
), phase4_surface(file_path) as (
  values
    ('apps/api/src/application/ports/dbtExecutionTarget.ts'),
    ('apps/api/src/application/ports/dbtProjectBundle.ts'),
    ('apps/api/src/application/ports/dbtRunExecutionContextWriter.ts'),
    ('apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts'),
    ('apps/api/src/application/services/PreviewPlanUseCase.ts'),
    ('apps/api/src/application/services/dbtPlanExecutionBinding.ts'),
    ('apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts'),
    ('apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts'),
    ('apps/api/src/application/services/runReadEvidenceModel.ts'),
    ('apps/api/src/entrypoints/http/planPreviewEnvelopeBinder.ts'),
    ('apps/api/src/entrypoints/http/previewPlanRouteRequestBinder.ts'),
    ('apps/api/src/entrypoints/http/protectedRuntimeRouteDependencies.ts'),
    ('apps/api/src/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.ts'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts'),
    ('apps/api/src/infrastructure/dbt/DbtProjectBundleBuilder.ts'),
    ('apps/api/src/infrastructure/dbt/FileDbtRunExecutionContextWriter.ts'),
    ('apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts'),
    ('apps/api/src/infrastructure/dbt/dbtProjectSourceSnapshot.ts'),
    ('apps/api/src/infrastructure/dbt/dbtProjectTarArchive.ts'),
    ('apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts'),
    ('apps/api/src/plugins/env.ts'),
    ('apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts'),
    ('apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts'),
    ('apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts'),
    ('apps/api/test/application/services/dbtPlanExecutionBinding.test.ts'),
    ('apps/api/test/application/services/executableSubgraphResolutionArchitecture.support.ts'),
    ('apps/api/test/application/services/executableSubgraphResolutionComponent.architecture.test.ts'),
    ('apps/api/test/application/services/getRunStatusUseCase.test.ts'),
    ('apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts'),
    ('apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts'),
    ('apps/api/test/entrypoints/http/planRouteFixtures.ts'),
    ('apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts'),
    ('apps/api/test/entrypoints/http/previewPlanRouteTestSupport.ts'),
    ('apps/api/test/entrypoints/http/protectedRuntimeRouteDependencies.test.ts'),
    ('apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts'),
    ('apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts'),
    ('apps/api/test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts'),
    ('apps/api/test/infrastructure/dbt/dbtProjectSourceSnapshot.test.ts'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'),
    ('apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'),
    ('apps/web/cypress/support/dbtProjectLive.ts'),
    ('apps/web/src/app/components/Modals.test.tsx'),
    ('apps/web/src/app/components/Modals.tsx'),
    ('apps/web/src/app/plugins/canvasExecutionStrategyContracts.ts'),
    ('apps/web/src/app/plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts'),
    ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
    ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
    ('apps/web/src/app/services/plans/plansService.api.ts'),
    ('apps/web/src/app/services/plans/plansService.test.ts'),
    ('apps/web/src/app/stores/canvasInteractionStore.test.ts'),
    ('apps/web/src/app/stores/canvasInteractionStore.ts'),
    ('apps/web/src/app/types/plans.ts'),
    ('apps/web/src/app/views/canvas/CanvasModalHost.architecture.test.tsx'),
    ('apps/web/src/app/views/canvas/CanvasModalHost.tsx'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx'),
    ('apps/web/src/app/views/canvas/canvasExecutionState.ts'),
    ('apps/web/src/app/views/canvas/canvasGitProvenance.ts'),
    ('apps/web/src/app/views/canvas/canvasModalHost.types.ts'),
    ('apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts'),
    ('apps/web/src/app/views/canvas/canvasPlanAction.ts'),
    ('apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts'),
    ('apps/web/src/app/views/canvas/canvasPreviewProvenance.ts'),
    ('apps/web/src/app/views/canvas/canvasRuntimePolicy.ts'),
    ('apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts'),
    ('apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts'),
    ('apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.provenance.test.tsx'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileExecution.ts'),
    ('apps/web/src/app/views/runs/RunStates.snapshotEvidence.test.tsx'),
    ('apps/web/src/app/views/runs/RunWorkspaceStateView.tsx'),
    ('docs/.manifest.json'),
    ('docs/contracts/planner/index.md'),
    ('docs/evidence/ED-20260715-dbt-project-roundtrip-phase4-run.md'),
    ('docs/evidence/index.md'),
    ('docs/planning/status/generated-code-state.md'),
    ('docs/risk-register/quality/R-20260715-DBT-PROJECT-ROUNDTRIP-P4.yaml'),
    ('docs/risk-register/quality/index.md'),
    ('packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts'),
    ('packages/@dvt/contracts/src/contracts/planner/TransformationFlowDesignGraph.v1.ts'),
    ('packages/@dvt/contracts/src/contracts/planner/TransformationFlowPreview.v1.ts'),
    ('packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepTypeConfigs.v1.ts'),
    ('packages/@dvt/contracts/src/index.ts'),
    ('packages/@dvt/contracts/src/schema-packs/plan-preview-profile.ts'),
    ('packages/@dvt/contracts/src/schema-packs/plan-preview-request.ts'),
    ('packages/@dvt/contracts/src/schema-packs/plan-preview-response.ts'),
    ('packages/@dvt/contracts/test/plan-preview-provenance.contract.test.ts'),
    ('packages/@dvt/contracts/test/validation/preview.ts'),
    ('scripts/run-dev-stack.cjs'),
    ('scripts/run-dev-stack.test.cjs'),
    ('scripts/run-selected-closure-live-proof.cjs'),
    ('scripts/run-selected-closure-live-proof.test.cjs'),
    ('tools/planning-db/migrations/697_dbt_project_file_execution_phase4_design.sql'),
    ('tools/planning-db/migrations/698_dbt_preview_authority_resolution_design.sql'),
    ('tools/planning-db/migrations/699_dbt_project_file_execution_phase4_component_reconciliation.sql'),
    ('tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql'),
    ('tools/planning-db/migrations/701_dbt_project_file_execution_phase4_maturity.sql'),
    ('tools/planning-db/migrations/702_dbt_project_file_execution_phase4_feature_manifest.sql')
), rail_surface_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(to_jsonb(file_path) order by file_path)
      from (
        select distinct surface.item #>> '{}' as file_path
        from jsonb_array_elements(
          coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)
        ) surface(item)
        union
        select phase4_surface.file_path
        from phase4_surface
      ) distinct_surface
    ) as surfaces
  from target_rail
), rail_command_query_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(item order by item ->> 'name')
      from (
        select distinct on (item ->> 'name') item
        from (
          select existing.item, 0 as priority
          from jsonb_array_elements(
            coalesce(target_rail.raw_manifest -> 'commandQueryRails', '[]'::jsonb)
          ) existing(item)
          union all
          values
            (jsonb_build_object('name', 'ProjectDbtGraphFromFiles', 'type', 'query', 'dddOwner', 'DbtProjectGraphProjection'), 1),
            (jsonb_build_object('name', 'BuildDbtPlannerGraphSource', 'type', 'query', 'dddOwner', 'DbtCanvasGraphSourceProjection'), 1),
            (jsonb_build_object('name', 'PreviewExecutionPlan', 'type', 'command', 'dddOwner', 'Canvas execution preview/readiness presentation'), 1),
            (jsonb_build_object('name', 'ObservePlanRunReadiness', 'type', 'query', 'dddOwner', 'PlanRunReadinessReadModel'), 1),
            (jsonb_build_object('name', 'StartRun', 'type', 'command', 'dddOwner', 'Run command application service'), 1)
        ) candidate(item, priority)
        order by item ->> 'name', priority desc
      ) distinct_rail
    ) as rails
  from target_rail
), rail_completion_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(to_jsonb(command) order by command)
      from (
        select distinct completion.item #>> '{}' as command
        from jsonb_array_elements(
          coalesce(target_rail.raw_manifest -> 'completionGate', '[]'::jsonb)
          || jsonb_build_array(
            'pnpm --filter @dvt/web test',
            'pnpm --filter @dvt/web typecheck',
            'pnpm --filter @dvt/web lint',
            'pnpm --filter @dvt/contracts schema:verify',
            'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
            'pnpm docs:feature-mechanization:implementation',
            'pnpm verify:prepush'
          )
        ) completion(item)
      ) distinct_completion
    ) as completion_gate
  from target_rail
), rail_cypress_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(to_jsonb(flow) order by flow)
      from (
        select distinct flow.item #>> '{}' as flow
        from jsonb_array_elements(
          coalesce(target_rail.raw_manifest -> 'cypressFlows', '[]'::jsonb)
          || jsonb_build_array(
            'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
            'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
          )
        ) flow(item)
      ) distinct_flow
    ) as cypress_flows
  from target_rail
), rail_governing_source_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(to_jsonb(source_ref) order by source_ref)
      from (
        select distinct source.item #>> '{}' as source_ref
        from jsonb_array_elements(
          coalesce(target_rail.raw_manifest -> 'governingSources', '[]'::jsonb)
          || jsonb_build_array(
            'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
          )
        ) source(item)
      ) distinct_source
    ) as governing_sources
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
  implementation_refs = rail_surface_manifest.surfaces,
  documentation_refs = (
    select jsonb_agg(to_jsonb(reference) order by reference)
    from (
      values
        ('docs/evidence/ED-20260715-dbt-project-roundtrip-phase4-run.md'),
        ('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
        ('docs/risk-register/quality/R-20260715-DBT-PROJECT-ROUNDTRIP-P4.yaml')
    ) documentation(reference)
  ),
  allowed_implementation_surfaces = rail_surface_manifest.surfaces,
  governing_sources = rail_governing_source_manifest.governing_sources,
  completion_gate = rail_completion_manifest.completion_gate,
  source_path = 'tools/planning-db/migrations/702_dbt_project_file_execution_phase4_feature_manifest.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':phase4-feature-manifest:702'), 2),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'phase4FeatureManifestClosedBy',
    '702_dbt_project_file_execution_phase4_feature_manifest'
  ),
  raw_manifest = rail.raw_manifest || jsonb_build_object(
    'currentImplementationSourcePath', 'tools/planning-db/migrations/702_dbt_project_file_execution_phase4_feature_manifest.sql',
    'symbols', rail_symbol_manifest.symbols,
    'allowedImplementationSurfaces', rail_surface_manifest.surfaces,
    'commandQueryRails', rail_command_query_manifest.rails,
    'cypressFlows', rail_cypress_manifest.cypress_flows,
    'completionGate', rail_completion_manifest.completion_gate,
    'governingSources', rail_governing_source_manifest.governing_sources,
    'redGreenCycles', coalesce(rail.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'id', 'phase4-file-authoritative-preview-run',
          'redTest', 'pnpm docs:feature-mechanization:implementation -- --feature E-DBT-PROJECT-ROUNDTRIP-1',
          'expectedFailure', 'Preview and StartRun lacked complete DB-first symbol and surface traceability for the file-authoritative execution vertical.',
          'patchSurfaces', jsonb_build_array(
            'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts',
            'apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts',
            'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts',
            'packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts'
          ),
          'greenTest', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
        )
      )
  ),
  revision = rail.revision + 1,
  updated_at = now()
from rail_symbol_manifest
join rail_surface_manifest using (rail_id)
join rail_command_query_manifest using (rail_id)
join rail_completion_manifest using (rail_id)
join rail_cypress_manifest using (rail_id)
join rail_governing_source_manifest using (rail_id)
where rail.rail_id = rail_symbol_manifest.rail_id;

do $$
declare
  target_rail_count integer;
  desired_symbol_count integer;
  actual_desired_symbol_count integer;
  canonical_rail_reference_count integer;
begin
  select count(*) into target_rail_count
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
    and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
    and rail.source_path = 'tools/planning-db/migrations/702_dbt_project_file_execution_phase4_feature_manifest.sql';

  with expected as (
    select file_path as path, symbol_name.value as name
    from (
      values
        ('apps/api/src/application/ports/dbtExecutionTarget.ts', jsonb_build_array('IDbtExecutionTargetResolver')),
        ('apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts', jsonb_build_array('ResolveAuthorizedPreviewSelectionService')),
        ('apps/api/src/infrastructure/dbt/DbtProjectBundleBuilder.ts', jsonb_build_array('DbtProjectBundleBuilder')),
        ('apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts', jsonb_build_array('buildDbtProjectFileExecutionStrategy')),
        ('packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts', jsonb_build_array('PlanPreviewProvenanceSchema'))
    ) representative(file_path, symbol_names)
    cross join lateral jsonb_array_elements_text(representative.symbol_names) symbol_name(value)
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

  select count(distinct rail_item ->> 'name') into canonical_rail_reference_count
  from planning_query_store.feature_mechanization_local_rails rail
  cross join lateral jsonb_array_elements(rail.raw_manifest -> 'commandQueryRails') rail_item
  where rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
    and rail_item ->> 'name' in (
      'ProjectDbtGraphFromFiles',
      'BuildDbtPlannerGraphSource',
      'PreviewExecutionPlan',
      'ObservePlanRunReadiness',
      'StartRun'
    );

  if target_rail_count <> 2 then
    raise exception 'Phase 4 feature reconciliation requires two existing feature rails, found %', target_rail_count;
  end if;

  if desired_symbol_count <> actual_desired_symbol_count then
    raise exception 'Phase 4 feature reconciliation is missing representative symbols: expected %, found %', desired_symbol_count, actual_desired_symbol_count;
  end if;

  if canonical_rail_reference_count <> 5 then
    raise exception 'Phase 4 feature reconciliation requires five reused canonical rails, found %', canonical_rail_reference_count;
  end if;

  if not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    where rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
      and rail.allowed_implementation_surfaces ? 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
      and rail.allowed_implementation_surfaces ? 'tools/planning-db/migrations/702_dbt_project_file_execution_phase4_feature_manifest.sql'
  ) then
    raise exception 'Phase 4 live proof or DB-first reconciliation surface is missing';
  end if;
end $$;
