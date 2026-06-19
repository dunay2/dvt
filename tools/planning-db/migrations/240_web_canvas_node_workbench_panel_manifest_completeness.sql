-- Complete the Canvas node workbench DB-local feature manifest after the
-- reseed migration made the symbols visible again. The implementation gate
-- requires the same complete vocabulary for DB-authored manifests as for
-- markdown-authored manifests.

update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = coalesce(
    rail.allowed_implementation_surfaces,
    '[]'::jsonb
  ) || jsonb_build_array(
    'tools/planning-db/migrations/240_web_canvas_node_workbench_panel_manifest_completeness.sql'
  ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'userStories', jsonb_build_array(
        'Node workbench is opened contextually from the canvas while graph remains the primary surface.',
        'Node details expose properties, columns, inputs/outputs, tests, and code without delegating to the generic inspector.'
      ),
      'forbiddenImplementationSurfaces', jsonb_build_array(
        'apps/web/src/app/components/InspectorPanel.tsx#Canvas node workbench rendering',
        'buzon/**'
      ),
      'domainObjects', jsonb_build_array(
        jsonb_build_object(
          'name', 'CanvasNodeWorkbenchPanel',
          'type', 'presentation component',
          'owner', 'Canvas workbench'
        ),
        jsonb_build_object(
          'name', 'NodePropertiesReadModel',
          'type', 'query read model',
          'owner', 'Canvas node properties'
        )
      ),
      'fowlerSignals', jsonb_build_array(
        'presentation_logic_separation',
        'component_ownership_drift',
        'responsibility_overload'
      ),
      'architectureGuards', jsonb_build_array(
        jsonb_build_object(
          'name', 'CanvasShellMainPanel.architecture.test.ts',
          'command', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts'
        )
      ),
      'cypressFlows', jsonb_build_array(
        jsonb_build_object(
          'name', 'not_applicable:component_boundary',
          'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
        )
      ),
      'allowedImplementationSurfaces',
      coalesce(rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
        || jsonb_build_array(
          'tools/planning-db/migrations/240_web_canvas_node_workbench_panel_manifest_completeness.sql'
        )
    ),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_id = 'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties';
