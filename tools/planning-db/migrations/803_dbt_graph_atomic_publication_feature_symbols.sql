-- Complete feature-mechanization ownership for the production symbols added by
-- the atomic graph DBT publication slice and its explicit replacement guard.

with incoming(
  name,
  path,
  ddd_owner,
  fowler_signals,
  architecture_guard,
  unit_tests
) as (
  values
    (
      'IPublishGraphDbtWorkspaceArtifactsCommand',
      'apps/api/src/application/ports/graphDbtWorkspaceArtifactPublication.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('port', 'command'),
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      jsonb_build_array('apps/api/test/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.test.ts')
    ),
    (
      'PublishGraphDbtWorkspaceArtifactsInput',
      'apps/api/src/application/ports/graphDbtWorkspaceArtifactPublication.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('parameter_object', 'value_object'),
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      jsonb_build_array('apps/api/test/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.test.ts')
    ),
    (
      'registerProtectedGraphDbtWorkspaceArtifactPublicationRouteGroup',
      'apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRouteGroup.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('service_layer', 'composition_root'),
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      jsonb_build_array('apps/api/test/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationRouteDeps',
      'apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('parameter_object', 'gateway'),
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      jsonb_build_array('apps/api/test/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.test.ts')
    ),
    (
      'registerGraphDbtWorkspaceArtifactPublicationRoutes',
      'apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('remote_facade', 'gateway'),
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      jsonb_build_array('apps/api/test/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.test.ts')
    ),
    (
      'respondInvalidRequest',
      'apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('mapper', 'error_translation'),
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      jsonb_build_array('apps/api/test/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.test.ts')
    ),
    (
      'IGraphDbtWorkspaceArtifactPublicationCommandPort',
      'apps/web/src/app/ports/graphDbtWorkspaceArtifactPublication.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('port', 'command'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.test.ts')
    ),
    (
      'useGraphDbtWorkspaceArtifactPublicationCommandPort',
      'apps/web/src/app/services/AppServicesContext.tsx',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('service_locator', 'composition_root'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts')
    ),
    (
      'GRAPH_DBT_WORKSPACE_ARTIFACT_PUBLICATION_ENDPOINT',
      'apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('gateway', 'remote_facade'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.test.ts')
    ),
    (
      'buildScopedEndpoint',
      'apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('mapper', 'pure_function'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.test.ts')
    ),
    (
      'createApiGraphDbtWorkspaceArtifactPublicationCommandPort',
      'apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('gateway', 'adapter'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.test.ts')
    ),
    (
      'GraphSqlReplacementConfirmationDialog',
      'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.tsx',
      'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
      jsonb_build_array('passive_view', 'presentation_component'),
      'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx',
      jsonb_build_array('apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx')
    ),
    (
      'GraphSqlReplacementConfirmationDialogProps',
      'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.tsx',
      'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
      jsonb_build_array('parameter_object', 'presentation_model'),
      'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx',
      jsonb_build_array('apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx')
    ),
    (
      'GraphSqlReplacementConfirmationState',
      'apps/web/src/app/views/canvas/canvasExecutionActions.types.ts',
      'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
      jsonb_build_array('value_object', 'presentation_model'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/useCanvasExecutionActions.graphSqlReplacement.test.tsx')
    ),
    (
      'CanvasPlanActionGraphSqlReplacementConfirmation',
      'apps/web/src/app/views/canvas/canvasPlanAction.ts',
      'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
      jsonb_build_array('result_type', 'value_object'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts')
    ),
    (
      'CanvasPlanActionResult',
      'apps/web/src/app/views/canvas/canvasPlanAction.ts',
      'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
      jsonb_build_array('result_type', 'discriminated_union'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts')
    ),
    (
      'GraphModelSqlReplacementAuthorization',
      'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts',
      'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
      jsonb_build_array('value_object', 'optimistic_offline_lock'),
      'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts')
    ),
    (
      'GraphSqlReplacementAuthorization',
      'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
      'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
      jsonb_build_array('value_object', 'authorization'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts')
    ),
    (
      'publicationIdempotencyKey',
      'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
      'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
      jsonb_build_array('pure_function', 'idempotent_receiver'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts')
    ),
    (
      'createGraphDbtWorkspaceArtifactPublicationCommandMock',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx',
      'CanvasExecutionActionsTestSupport',
      jsonb_build_array('test_double', 'object_mother'),
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
      jsonb_build_array('apps/web/src/app/views/canvas/useCanvasExecutionActions.graphSqlReplacement.test.tsx')
    ),
    (
      'GraphDbtArtifactPathSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactExpectedRevision',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'optimistic_offline_lock'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactExpectedRevisionSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationApplied',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('result_type', 'value_object'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationAppliedSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('result_type', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationConflict',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('result_type', 'value_object'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationConflictSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('result_type', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationItem',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'parameter_object'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationItemSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationResult',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('result_type', 'discriminated_union'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublicationResultSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('result_type', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'GraphDbtWorkspaceArtifactPublishedWriteSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'NonBlankStringSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'PublishGraphDbtWorkspaceArtifactsRequest',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('parameter_object', 'value_object'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'PublishGraphDbtWorkspaceArtifactsRequestSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('parameter_object', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    ),
    (
      'Sha256HexStringSchema',
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'GraphDbtWorkspaceArtifactPublication',
      jsonb_build_array('value_object', 'schema'),
      'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
      jsonb_build_array('packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts')
    )
),
symbols as (
  select jsonb_build_object(
    'name', name,
    'path', path,
    'dddOwner', ddd_owner,
    'cqRails', jsonb_build_array('PublishGraphDbtWorkspaceArtifacts'),
    'fowlerSignals', fowler_signals,
    'architectureGuard', architecture_guard,
    'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'unitTests', unit_tests
  ) as symbol
  from incoming
),
merged_symbols as (
  select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name') as value
  from (
    select distinct on (symbol ->> 'path', symbol ->> 'name') symbol
    from (
      select jsonb_array_elements(
        coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
      ) as symbol
      from planning_query_store.feature_mechanization_local_rails rail
      where rail.rail_id =
        'local#E-WEB-DBT-ATOMIC-PUBLICATION-1#command#publishgraphdbtworkspaceartifacts'
      union all
      select symbol
      from symbols
    ) combined
    order by symbol ->> 'path', symbol ->> 'name'
  ) deduplicated
),
merged_refs as (
  select jsonb_agg(to_jsonb(ref) order by ref) as value
  from (
    select distinct ref
    from (
      select jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
      ) as ref
      from planning_query_store.feature_mechanization_local_rails rail
      where rail.rail_id =
        'local#E-WEB-DBT-ATOMIC-PUBLICATION-1#command#publishgraphdbtworkspaceartifacts'
      union all
      select path || '#' || name
      from incoming
    ) combined
  ) deduplicated
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged_refs.value,
  raw_manifest = jsonb_set(
    rail.raw_manifest,
    '{symbols}',
    merged_symbols.value,
    true
  ),
  source_path = 'tools/planning-db/migrations/803_dbt_graph_atomic_publication_feature_symbols.sql',
  source_content_sha256 = repeat(md5('PublishGraphDbtWorkspaceArtifacts:symbols:803'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from merged_symbols, merged_refs
where rail.rail_id =
  'local#E-WEB-DBT-ATOMIC-PUBLICATION-1#command#publishgraphdbtworkspaceartifacts';

do $$
declare
  declared_symbol_count integer;
begin
  select count(distinct symbol.value ->> 'name')
  into declared_symbol_count
  from planning_query_store.feature_mechanization_local_rails rail
  cross join lateral jsonb_array_elements(
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
  ) symbol(value)
  where rail.rail_id =
    'local#E-WEB-DBT-ATOMIC-PUBLICATION-1#command#publishgraphdbtworkspaceartifacts';

  if declared_symbol_count <> 38 then
    raise exception 'Atomic DBT publication manifest must declare 38 distinct symbols, found %', declared_symbol_count;
  end if;
end
$$;
