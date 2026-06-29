update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx#ACTION_ICON'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx#getActionClassName')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'nodeFloatingToolbar', jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.NodeFloatingToolbar',
        'rail', 'RenderCanvasNodeFloatingToolbar',
        'usesExistingExecutionSelectionCommand', true,
        'doesNotStartRun', true
      ),
      'allowedImplementationSurfaces',
      (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          values
            ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts'),
            ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'),
            ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx'),
            ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'),
            ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
            ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'),
            ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
            ('docs/superpowers/plans/2026-06-29-node-floating-toolbar.md'),
            ('tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql'),
            ('tools/planning-db/migrations/373_canvas_node_floating_toolbar_manifest_completion.sql')
        ) surfaces(value)
      ),
      'symbols',
      (
        select jsonb_agg(value order by value::text)
        from (
          select distinct value
          from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) as symbol_refs(value)
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarAction',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('read_model_action_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarActionId',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('closed_action_set'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarActionTone',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('presentation_tone_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarModel',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('query_read_model'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'BuildCanvasNodeFloatingToolbarModelArgs',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('read_model_input_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'buildCanvasNodeFloatingToolbarModel',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('query_model_builder', 'no_fake_run_command'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'ACTION_ICON',
            'path', 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('presentation_icon_map'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarView',
            'path', 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('passive_presentation_template'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarViewProps',
            'path', 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('presentation_input_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'getActionClassName',
            'path', 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('presentation_style_policy'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
          ) raw_symbols(value)
        ) symbols(value)
      )
    ),
  source_path = 'tools/planning-db/migrations/373_canvas_node_floating_toolbar_manifest_completion.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:373'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
