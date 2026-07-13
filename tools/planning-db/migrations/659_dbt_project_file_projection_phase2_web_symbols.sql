-- Reconcile every Web symbol introduced by the read-only dbt file projection.
-- Shared composition files remain owned by their existing components; this
-- feature manifest records only the symbols and surfaces it is allowed to alter.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), declared_symbol(path, name, ddd_owner) as (
  values
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'CANVAS_ID', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'DragPoint', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'INVALID_PROJECT_ROOT', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'PROJECT_FILES', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'PROJECT_ROOT', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'buildMouseEvent', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'dispatchDragEvent', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'dragNode', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'expectProjectedCardsNotToOverlap', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'readRequiredEnv', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'saveWorkspaceFile', 'DbtProjectFileCanvas'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'seedDbtProjectFiles', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts', 'dbtProjectFileCanvasSurfaceStrategy', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/ports/dbtProjectGraph.ts', 'DbtProjectFilesAuthorityBinding', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/ports/dbtProjectGraph.ts', 'IDbtProjectGraphQueryPort', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/queries/dbtProjectQueries.ts', 'useDbtProjectGraphQuery', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/queries/workspaceQueries.ts', 'useWorkspaceGraphForViewQuery', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/services/AppServicesContext.tsx', 'useDbtProjectGraphQueryPort', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts', 'DBT_PROJECT_GRAPH_ENDPOINT', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts', 'assertProjectionMatchesAuthority', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts', 'buildDbtProjectGraphEndpoint', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts', 'createApiDbtProjectGraphQueryPort', 'DbtProjectGraphProjection'),
    ('apps/web/src/app/views/Canvas.tsx', 'CanvasContent', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/Canvas.tsx', 'GraphDraftCanvasContent', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/CodeView.tsx', 'CodeViewFileScope', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'resolveNodeWorkbenchHiddenGeneralRowLabels', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx', 'DbtProjectFileCanvas', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx', 'InvalidCanvasAuthority', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'CodeView', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'DbtProjectFileCanvasController', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'DbtProjectFileCanvasView', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'DbtProjectProjectionNotice', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'resolveCenterSurface', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'resolveProjectTitle', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'unsupportedFileProjectionCommand', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/canvasPalette.ts', 'deriveCanvasGridStroke', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/canvasRouteAuthority.ts', 'CanvasRouteAuthorityResolution', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/canvasRouteAuthority.ts', 'FILE_AUTHORITY', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/canvasRouteAuthority.ts', 'resolveCanvasRouteAuthority', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/canvasShell.types.ts', 'CanvasShellWorkspaceCommands', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/dbtProjectFileLayout.ts', 'DBT_PROJECT_FILE_LAYOUT_GAP', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileLayout.ts', 'DBT_PROJECT_FILE_LAYOUT_NODE_SIZE', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileLayout.ts', 'DbtProjectFileNodePositions', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileLayout.ts', 'buildDbtProjectFileInitialNodePositions', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileLayout.ts', 'mergeDbtProjectFileNodePositions', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'DbtProjectFileCanvasProjection', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'DbtProjectedNode', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'EDGE_RELATION', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'RESOURCE_PRESENTATION', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'normalizeWorkspacePath', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'projectDbtProjectGraphToCanonicalCanvas', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'projectNode', 'DbtProjectFileCanvasProjection'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'DBT_PROJECT_FILE_NODE_TYPES', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'EMPTY_CANONICAL_EDGES', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'EMPTY_CANONICAL_NODES', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'EMPTY_FROZEN_NODE_IDS', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'EMPTY_NODE_POSITIONS', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'ProjectCodeWorkbenchState', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'buildCanonicalEdgeIdMap', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'buildCanonicalNodeMap', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'buildLayoutKey', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'buildProjectionErrorMessage', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'unsupportedSemanticMutation', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'useDbtProjectFileCanvasController', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/code/codeViewFileSelection.ts', 'filterCodeWorkspaceFilesByProjectRoot', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/code/codeViewFileSelection.ts', 'resolveInitialDbtProjectFilePath', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/code/codeViewFileSelection.ts', 'resolveProjectPath', 'DbtProjectFileCanvas'),
    ('apps/web/src/app/views/code/codeViewFileSelection.ts', 'resolveProjectRootScopedCodeWorkspaceFileTree', 'DbtProjectFileCanvas')
), symbol_manifest as (
  select
    jsonb_agg(
      jsonb_build_object(
        'name', name,
        'path', path,
        'dddOwner', ddd_owner,
        'cqRails', jsonb_build_array('ProjectDbtGraphFromFiles'),
        'fowlerSignals', jsonb_build_array(
          case
            when ddd_owner = 'DbtProjectGraphProjection' then 'Boundary drift'
            when ddd_owner = 'DbtProjectFileCanvasProjection' then 'Feature envy'
            else 'Responsibility overload'
          end
        ),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run',
        'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
        'unitTests', jsonb_build_array(
          case
            when path like 'apps/web/src/app/services/dbtProject/%'
              or path = 'apps/web/src/app/ports/dbtProjectGraph.ts'
              or path = 'apps/web/src/app/queries/dbtProjectQueries.ts'
              then 'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.test.ts'
            when path = 'apps/web/src/app/views/canvas/dbtProjectFileLayout.ts'
              then 'apps/web/src/app/views/canvas/dbtProjectFileLayout.test.ts'
            when path = 'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts'
              then 'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts'
            when path = 'apps/web/src/app/views/code/codeViewFileSelection.ts'
              then 'apps/web/src/app/views/code/codeViewFileSelection.test.ts'
            else 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts'
          end
        )
      ) order by path, name
    ) as symbols
  from declared_symbol
), reconciled_symbol_refs as (
  select jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select value as ref
    from target_rail,
      lateral jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) item(value)
    union
    select path || '#' || name from declared_symbol
  ) all_ref
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select value as surface
    from target_rail,
      lateral jsonb_array_elements_text(
        coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      ) item(value)
    union
    values
      ('apps/web/src/app/components/canvas/DbtNodeComponent.tsx'),
      ('apps/web/src/app/views/CodeView.test.tsx'),
      ('tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql'),
      ('tools/planning-db/migrations/659_dbt_project_file_projection_phase2_web_symbols.sql')
  ) all_surface
), reconciled_implementation_refs as (
  select jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select value as ref
    from target_rail,
      lateral jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) item(value)
    union
    values
      ('apps/web/src/app/components/canvas/DbtNodeComponent.tsx'),
      ('apps/web/src/app/views/CodeView.test.tsx'),
      ('tools/planning-db/migrations/659_dbt_project_file_projection_phase2_web_symbols.sql')
  ) all_ref
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = reconciled_symbol_refs.refs,
  implementation_refs = reconciled_implementation_refs.refs,
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{symbols}',
      coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || symbol_manifest.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/659_dbt_project_file_projection_phase2_web_symbols.sql',
  source_content_sha256 = repeat(md5('ProjectDbtGraphFromFiles:phase2-web-symbols:659'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from symbol_manifest,
  reconciled_symbol_refs,
  reconciled_surfaces,
  reconciled_implementation_refs
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';
