-- Reconcile every production symbol added by the phase-two contract and API
-- slice with its DB-first feature manifest. Symbols are explicit; shared
-- evidence metadata is derived only from the owning source boundary.

with declared_symbol(path, name) as (
  values
    ('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'AnalyzeDbtProjectInput'),
    ('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'DbtProjectAnalysis'),
    ('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'DbtProjectAnalysisDependency'),
    ('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'DbtProjectAnalysisResource'),
    ('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'IDbtProjectAnalyzerPort'),
    ('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'ProjectedEdge'),
    ('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'ProjectedNode'),
    ('apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts', 'ProjectDbtGraphFromFilesInput'),
    ('apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts', 'ProjectDbtGraphFromFilesUseCase'),
    ('apps/api/src/entrypoints/http/dbtProjectGraphRouteGroup.ts', 'RuntimeAuth'),
    ('apps/api/src/entrypoints/http/dbtProjectGraphRouteGroup.ts', 'registerProtectedDbtProjectGraphRouteGroup'),
    ('apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts', 'DbtProjectGraphQuery'),
    ('apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts', 'DbtProjectGraphRouteDeps'),
    ('apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts', 'authorizeDbtProjectGraphRequest'),
    ('apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts', 'parseDbtProjectGraphQuery'),
    ('apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts', 'registerDbtProjectGraphRoutes'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'ANALYZER_VERSION'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'DEFAULT_MAX_OUTPUT_BYTES'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'DEFAULT_MAX_PROJECT_BYTES'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'DEFAULT_MAX_PROJECT_FILES'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'DEFAULT_TIMEOUT_MS'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'DbtCliProjectAnalyzer'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'DbtCliProjectAnalyzerOptions'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'assertContainedPath'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'isContainedPath'),
    ('apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'isFile'),
    ('apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts', 'hashDbtAnalysis'),
    ('apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts', 'sha256Hex'),
    ('apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts', 'sortJsonValue'),
    ('apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts', 'stableJson'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'ANSI_ESCAPE_SEQUENCE'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'DbtProcessRunner'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'NODE_DBT_PROCESS_RUNNER'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'ProcessRunInput'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'ProcessRunResult'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'buildSanitizedProcessEnvironment'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'extractDbtMessages'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'normalizeProcessDiagnostic'),
    ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 'numericExitCode'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'ManifestProjection'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'SUPPORTED_RESOURCE_TYPES'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'collectionValues'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'deduplicateDependencies'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'dependencyRelation'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'isRecord'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'projectDbtManifest'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'projectResource'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'projectTestMetadata'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'record'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'stringArray'),
    ('apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 'stringValue'),
    ('apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'EXCLUDED_DIRECTORY_NAMES'),
    ('apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'EXCLUDED_FILE_NAMES'),
    ('apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'ProjectContentRevision'),
    ('apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'hashProjectContent'),
    ('apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'stableJson'),
    ('apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'visitProjectDirectory'),
    ('packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'CanvasAuthoringAuthorityBinding'),
    ('packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'CanvasAuthoringAuthorityBindingSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'DbtProjectFilesAuthoritySchema'),
    ('packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'GraphDraftAuthoritySchema'),
    ('packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'NonBlankStringSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'WorkspaceRelativeProjectRootSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtDiagnosticSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtProjectGraphProjection'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtProjectGraphProjectionSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtProjectRevisionSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtProjectedColumnSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtProjectedEdgeSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtProjectedNodeSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtProjectedTestMetadataSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'DbtVisualEditabilitySchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'IsoUtcStringSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'NonBlankStringSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'NonNegativeIntegerSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'Sha256HexStringSchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'UniqueNonBlankStringArraySchema'),
    ('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 'addDuplicateIssues')
), symbol_manifest as (
  select jsonb_agg(
    jsonb_build_object(
      'name', name,
      'path', path,
      'dddOwner', case
        when path like 'packages/@dvt/contracts/%' then 'CanvasAuthoringAuthorityBinding'
        when path like 'apps/api/src/infrastructure/dbt/%' then 'IDbtProjectAnalyzerPort'
        else 'DbtProjectGraphProjection'
      end,
      'cqRails', jsonb_build_array('ProjectDbtGraphFromFiles'),
      'fowlerSignals', jsonb_build_array(case
        when path like 'packages/@dvt/contracts/%' then 'Hidden authority'
        when path like 'apps/api/src/infrastructure/dbt/%' then 'Boundary drift'
        else 'Responsibility overload'
      end),
      'architectureGuard', case
        when path like 'packages/@dvt/contracts/%'
          then 'pnpm --filter @dvt/contracts test'
        else 'pnpm --filter dvt-api test:arch'
      end,
      'cypressCoverage', 'not_applicable:phase_two_contract_and_server_query',
      'unitTests', jsonb_build_array(case
        when path like 'packages/@dvt/contracts/%'
          then 'packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts'
        when path like 'apps/api/src/infrastructure/dbt/%'
          then 'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts'
        when path like 'apps/api/src/entrypoints/http/%'
          then 'apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts'
        else 'apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts'
      end)
    ) order by path, name
  ) as symbols,
  jsonb_agg(to_jsonb(path || '#' || name) order by path, name) as symbol_refs
  from declared_symbol
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = symbol_manifest.symbol_refs,
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array('tools/planning-db/migrations/647_dbt_project_file_projection_phase2_symbol_reconciliation.sql'),
  allowed_implementation_surfaces = coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/647_dbt_project_file_projection_phase2_symbol_reconciliation.sql',
      'tools/planning-db/migrations/648_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/649_dbt_project_file_projection_phase2_live_closeout.sql'
    ),
  raw_manifest = jsonb_set(
    jsonb_set(
      rail.raw_manifest,
      '{symbols}',
      symbol_manifest.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/planning-db/migrations/647_dbt_project_file_projection_phase2_symbol_reconciliation.sql',
        'tools/planning-db/migrations/648_dbt_project_file_projection_phase2_web_closeout.sql',
        'tools/planning-db/migrations/649_dbt_project_file_projection_phase2_live_closeout.sql'
      ),
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from symbol_manifest
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';
