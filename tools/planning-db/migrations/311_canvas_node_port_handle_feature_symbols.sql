-- Declare the CanvasNodePortHandle symbols in the DB-first feature
-- mechanization manifest. The implementation guard reads raw_manifest.symbols,
-- so the symbols must be present there in addition to operational refs.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'symbols',
      coalesce(raw_manifest->'symbols', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'name', 'CanvasNodePortHandle',
            'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('boundary_drift'),
            'architectureGuard', 'CanvasNodeShell.test.tsx',
            'cypressCoverage', 'not_applicable:presentation_component_boundary',
            'unitTests', jsonb_build_array(
              'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
            )
          ),
          jsonb_build_object(
            'name', 'CanvasNodePortHandleKind',
            'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('boundary_drift'),
            'architectureGuard', 'CanvasNodeShell.test.tsx',
            'cypressCoverage', 'not_applicable:type_alias',
            'unitTests', jsonb_build_array(
              'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
            )
          ),
          jsonb_build_object(
            'name', 'CanvasNodePortHandleProps',
            'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('boundary_drift'),
            'architectureGuard', 'CanvasNodeShell.test.tsx',
            'cypressCoverage', 'not_applicable:type_alias',
            'unitTests', jsonb_build_array(
              'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
            )
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/311_canvas_node_port_handle_feature_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodePortHandleSymbols:311'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
