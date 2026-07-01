-- Register NodeFloatingToolbar More as a governed launcher into the existing
-- node context-menu rail. This does not add node actions to the toolbar; the
-- action semantics remain owned by CanvasNodeContextMenu.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'actionProjectionPolicy',
      jsonb_build_object(
        'operableActions', jsonb_build_array('code', 'more'),
        'visibleUnavailableActions', jsonb_build_array('freeze'),
        'omittedUntilRailExists', jsonb_build_array(),
        'moreDelegatesTo', 'web.component.canvas.CanvasNodeContextMenu',
        'moreDelegationRail', 'ResolveCanvasContextMenu',
        'noNodeActionDuplication', true
      )
    ),
  source_path = 'tools/planning-db/migrations/447_node_floating_toolbar_more_context_menu_launcher.sql',
  source_content_sha256 = md5('file:canvasNodeFloatingToolbarModel:more-context-menu-launcher:447'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'moreLauncherRendering',
      jsonb_build_object(
        'actionId', 'more',
        'ariaLabel', 'Más acciones',
        'visibleLabel', false,
        'icon', 'MoreHorizontal',
        'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu'
      )
    ),
  source_path = 'tools/planning-db/migrations/447_node_floating_toolbar_more_context_menu_launcher.sql',
  source_content_sha256 = md5('file:CanvasNodeFloatingToolbarView:more-context-menu-launcher:447'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'moreLauncherIntegration',
      jsonb_build_object(
        'gesture', 'left-click node toolbar More dispatches contextmenu on the node context trigger',
        'delegatesToRail', 'ResolveCanvasContextMenu',
        'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
        'doesNotRenderParallelNodeActionMenu', true
      )
    ),
  source_path = 'tools/planning-db/migrations/447_node_floating_toolbar_more_context_menu_launcher.sql',
  source_content_sha256 = md5('file:CanvasViewport:more-context-menu-launcher:447'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/CanvasViewport.tsx';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeFloatingToolbar',
  'EV-CANVAS-NODE-FLOATING-TOOLBAR-MORE-CONTEXT-MENU-LAUNCHER',
  'integration-test',
  'current',
  'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts;apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx;apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
  'RenderCanvasNodeFloatingToolbar',
  'node-left-click',
  'NodeFloatingToolbar exposes Más acciones as an operable launcher into the existing CanvasNodeContextMenu rail instead of duplicating node-specific actions.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected Más acciones to exist and dispatch a contextmenu event, but the toolbar omitted it',
    'operableActions', jsonb_build_array('code', 'more'),
    'visibleUnavailableActions', jsonb_build_array('freeze'),
    'delegatesToRail', 'ResolveCanvasContextMenu',
    'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
    'noParallelNodeActionMenu', true,
    'commands',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'
    )
  ),
  'tools/planning-db/migrations/447_node_floating_toolbar_more_context_menu_launcher.sql',
  md5('evidence:NodeFloatingToolbar:more-context-menu-launcher:447')
)
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-NODE-FLOATING-TOOLBAR-MORE-CONTEXT-MENU-LAUNCHER')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'moreContextMenuLauncher',
      jsonb_build_object(
        'rail', 'RenderCanvasNodeFloatingToolbar',
        'delegatesToRail', 'ResolveCanvasContextMenu',
        'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
        'doesNotOwnNodeMenuActions', true
      )
    ),
  source_path = 'tools/planning-db/migrations/447_node_floating_toolbar_more_context_menu_launcher.sql',
  source_content_sha256 = md5('component:NodeFloatingToolbar:more-context-menu-launcher:447'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'nodeFloatingToolbarMoreContextMenuLauncher',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.NodeFloatingToolbar',
        'rail', 'RenderCanvasNodeFloatingToolbar',
        'delegatesToRail', 'ResolveCanvasContextMenu',
        'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
        'noParallelNodeActionMenu', true
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('tools/planning-db/migrations/447_node_floating_toolbar_more_context_menu_launcher.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/447_node_floating_toolbar_more_context_menu_launcher.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:more-context-menu-launcher:447'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
