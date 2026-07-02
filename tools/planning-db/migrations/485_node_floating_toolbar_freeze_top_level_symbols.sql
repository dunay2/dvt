-- Mirror the ToggleCanvasNodeFreeze helper symbols into the top-level
-- feature-mechanization `symbols` array consumed by the implementation guard.
-- Migration 484 records the local rail context; this migration preserves that
-- context while making the symbols mechanically visible to the guard.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'symbols',
      coalesce(raw_manifest->'symbols', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'name', 'buildWorkspaceCanvasLayout',
            'path', 'apps/web/src/app/stores/canvasInteractionStore.ts',
            'dddOwner', 'CanvasInteractionStore',
            'cqRails', jsonb_build_array('ToggleCanvasNodeFreeze'),
            'fowlerSignals', jsonb_build_array('state_shape_builder', 'preserve_existing_layout_state'),
            'architectureGuard', 'apps/web/src/app/stores/canvasInteractionStore.test.ts',
            'cypressCoverage', 'not_applicable:ui_local_state_helper',
            'unitTests', jsonb_build_array('apps/web/src/app/stores/canvasInteractionStore.test.ts')
          ),
          jsonb_build_object(
            'name', 'toggleFrozenNodeId',
            'path', 'apps/web/src/app/stores/canvasInteractionStore.ts',
            'dddOwner', 'CanvasInteractionStore',
            'cqRails', jsonb_build_array('ToggleCanvasNodeFreeze'),
            'fowlerSignals', jsonb_build_array('pure_state_transition', 'set_membership_toggle'),
            'architectureGuard', 'apps/web/src/app/stores/canvasInteractionStore.test.ts',
            'cypressCoverage', 'not_applicable:ui_local_state_helper',
            'unitTests', jsonb_build_array('apps/web/src/app/stores/canvasInteractionStore.test.ts')
          ),
          jsonb_build_object(
            'name', 'EMPTY_FROZEN_NODE_IDS',
            'path', 'apps/web/src/app/views/canvas/useCanvasStoreFacade.ts',
            'dddOwner', 'CanvasStoreFacade',
            'cqRails', jsonb_build_array('ToggleCanvasNodeFreeze'),
            'fowlerSignals', jsonb_build_array('stable_empty_collection', 'render_churn_guard'),
            'architectureGuard', 'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
            'cypressCoverage', 'not_applicable:render_stability_constant',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx')
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/485_node_floating_toolbar_freeze_top_level_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:freeze-top-level-symbols:485'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
