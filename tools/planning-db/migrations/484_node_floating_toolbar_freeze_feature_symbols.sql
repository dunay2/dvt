-- Declare the helper symbols introduced by ToggleCanvasNodeFreeze so the
-- feature-mechanization implementation guard can verify the slice without
-- treating UI-local state helpers as undocumented drift.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/stores/canvasInteractionStore.ts#buildWorkspaceCanvasLayout'),
        ('apps/web/src/app/stores/canvasInteractionStore.ts#toggleFrozenNodeId'),
        ('apps/web/src/app/views/canvas/useCanvasStoreFacade.ts#EMPTY_FROZEN_NODE_IDS')
    ) updated_refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/stores/canvasInteractionStore.ts'),
        ('apps/web/src/app/stores/canvasInteractionStore.test.ts'),
        ('apps/web/src/app/views/canvas/useCanvasStoreFacade.ts'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql'),
        ('tools/planning-db/migrations/484_node_floating_toolbar_freeze_feature_symbols.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'nodeFloatingToolbarFreezeCommandSymbols',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.NodeFloatingToolbar',
        'commandRail', 'ToggleCanvasNodeFreeze',
        'stateScope', 'workspace-local-canvas-interaction',
        'symbols',
        jsonb_build_array(
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
      )
    ),
  source_path = 'tools/planning-db/migrations/484_node_floating_toolbar_freeze_feature_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:freeze-symbols:484'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
