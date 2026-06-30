-- Register the Canvas node floating toolbar as a DB-first presentation/query
-- component. It is intentionally separate from the right-click node context
-- menu and from the graph node card body.

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  raw_component,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeFloatingToolbar',
  'NodeFloatingToolbar',
  'context-panel',
  'current',
  'create',
  'Canvas workbench',
  'Own the left-click node floating toolbar presentation without replacing the right-click CanvasNodeContextMenu or owning graph mutation.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'dbFirst', true,
    'parentComponentId', 'web.component.canvas.GraphNodeCard',
    'relatedComponentIds', jsonb_build_array(
      'web.component.canvas.GraphNodeCard',
      'web.component.canvas.CanvasNodeContextMenu',
      'web.component.canvas.CanvasViewport'
    ),
    'fowlerSignals', jsonb_build_array(
      'responsibility_overload',
      'duplicate_semantics'
    ),
    'renderRail', 'RenderCanvasNodeFloatingToolbar',
    'reusedCommands', jsonb_build_array('ToggleCanvasExecutionSelection'),
    'nonOwnedActions', jsonb_build_object(
      'rightClickNodeMenu', 'web.component.canvas.CanvasNodeContextMenu',
      'runStart', 'not owned by this component'
    )
  ),
  'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
  md5('web.component.canvas.NodeFloatingToolbar:372')
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeFloatingToolbar',
  'web.canvas.graph',
  '/canvas',
  'node-floating-toolbar',
  46,
  jsonb_build_object(
    'surfaceRole', 'left-click node floating action overlay',
    'hostComponentId', 'web.component.canvas.CanvasViewport'
  ),
  'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
  md5('surface:NodeFloatingToolbar:web.canvas.graph:372')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_contexts (
  component_id,
  context_id,
  context_kind,
  context_status,
  responsibility,
  raw_context,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeFloatingToolbar',
  'node-left-click',
  'node',
  'current',
  'Resolve actions for a left-clicked graph node as a compact floating toolbar.',
  jsonb_build_object(
    'trigger', 'left-click-node',
    'rightClickMenuComponentId', 'web.component.canvas.CanvasNodeContextMenu',
    'ownsNodeMutation', false,
    'closesOn', jsonb_build_array('pane-click', 'node-drag', 'pane-context-menu', 'edge-context-menu')
  ),
  'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
  md5('context:NodeFloatingToolbar:node-left-click:372')
)
on conflict (component_id, context_id) do update set
  context_kind = excluded.context_kind,
  context_status = excluded.context_status,
  responsibility = excluded.responsibility,
  raw_context = excluded.raw_context,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_context_actions (
  component_id,
  context_id,
  action_id,
  action_label,
  action_kind,
  action_status,
  rail_name,
  action_order,
  raw_action,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.NodeFloatingToolbar',
    'node-left-click',
    'open-node-code',
    'Código',
    'node-workbench',
    'valid',
    'RenderCanvasNodeFloatingToolbar',
    10,
    jsonb_build_object(
      'delegatesTo', 'InspectCanvasNodeProperties',
      'preferredTabId', 'code',
      'doesNotOpenProjectCode', true
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('action:NodeFloatingToolbar:open-node-code:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'node-left-click',
    'freeze-node',
    'Congelar',
    'selection-operation',
    'planned',
    'RenderCanvasNodeFloatingToolbar',
    20,
    jsonb_build_object(
      'visibleButDisabled', true,
      'reason', 'Freeze semantics require a governed command before mutation can be enabled.'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('action:NodeFloatingToolbar:freeze-node:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'node-left-click',
    'toggle-execution-selection-from-toolbar',
    'Seleccionar para ejecución',
    'selection-operation',
    'valid',
    'RenderCanvasNodeFloatingToolbar',
    30,
    jsonb_build_object(
      'usesExistingCommand', 'ToggleCanvasExecutionSelection',
      'doesNotStartRun', true,
      'playTone', 'success'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('action:NodeFloatingToolbar:toggle-execution-selection:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'node-left-click',
    'open-node-overflow',
    'Más acciones',
    'node-workbench',
    'planned',
    'RenderCanvasNodeFloatingToolbar',
    40,
    jsonb_build_object(
      'visibleButDisabled', true,
      'destinationComponentId', 'web.component.canvas.CanvasNodeContextMenu',
      'reason', 'Overflow must reuse the governed node context-menu action vocabulary before it becomes active.'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('action:NodeFloatingToolbar:open-node-overflow:372')
  )
on conflict (component_id, context_id, action_id) do update set
  action_label = excluded.action_label,
  action_kind = excluded.action_kind,
  action_status = excluded.action_status,
  rail_name = excluded.rail_name,
  action_order = excluded.action_order,
  raw_action = excluded.raw_action,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeFloatingToolbar',
  'RenderCanvasNodeFloatingToolbar',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'kind', 'query',
    'context', 'node-left-click',
    'dddObject', 'CanvasNodeFloatingToolbarModel',
    'applicationPort', 'local-presenter-model',
    'adapterSurface', 'CanvasNodeFloatingToolbarView',
    'negativeTests', jsonb_build_array(
      'unavailable callbacks disable actions instead of faking success',
      'pane and context-menu gestures close the toolbar',
      'play does not start a run'
    )
  ),
  'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
  md5('rail:NodeFloatingToolbar:RenderCanvasNodeFloatingToolbar:372')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.NodeFloatingToolbar',
    'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
    'model',
    'buildCanvasNodeFloatingToolbarModel',
    jsonb_build_object(
      'responsibility', 'Pure left-click node floating-toolbar presentation model.',
      'rail', 'RenderCanvasNodeFloatingToolbar'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('file:canvasNodeFloatingToolbarModel.ts:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx',
    'presentation',
    'CanvasNodeFloatingToolbarView',
    jsonb_build_object(
      'responsibility', 'Passive floating toolbar template with green play affordance.',
      'rail', 'RenderCanvasNodeFloatingToolbar'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('file:CanvasNodeFloatingToolbarView.tsx:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves ordered actions, unavailable action behavior, and execution selection delegation.',
      'rail', 'RenderCanvasNodeFloatingToolbar'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('file:canvasNodeFloatingToolbarModel.test.ts:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves visible toolbar action labels and green play presentation.',
      'rail', 'RenderCanvasNodeFloatingToolbar'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('file:CanvasNodeFloatingToolbarView.test.tsx:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'integration-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves left-click opens the toolbar and competing canvas surfaces close it.',
      'rail', 'RenderCanvasNodeFloatingToolbar'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('file:CanvasViewport.nodeFloatingToolbar.test.tsx:372')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'host',
    'CanvasViewport',
    jsonb_build_object(
      'responsibility', 'Hosts NodeFloatingToolbar state and positions it relative to the viewport.',
      'relatedComponentId', 'web.component.canvas.NodeFloatingToolbar'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('file:CanvasViewport.tsx:node-floating-toolbar:372')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
    'host',
    'CanvasViewportSurfaceView',
    jsonb_build_object(
      'responsibility', 'Mounts NodeFloatingToolbar and closes it on competing surface gestures.',
      'relatedComponentId', 'web.component.canvas.NodeFloatingToolbar'
    ),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('file:CanvasViewportSurfaceView.tsx:node-floating-toolbar:372')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
values
  (
    'web.component.canvas.NodeFloatingToolbar',
    'EV-CANVAS-NODE-FLOATING-TOOLBAR-MODEL',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts',
    'RenderCanvasNodeFloatingToolbar',
    'node-left-click',
    'Model proves action order, labels, descriptions, disabled missing callbacks, and green play semantics.',
    jsonb_build_object('noFakeCommands', true),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('evidence:NodeFloatingToolbar:model:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'EV-CANVAS-NODE-FLOATING-TOOLBAR-VIEW',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx',
    'RenderCanvasNodeFloatingToolbar',
    'node-left-click',
    'View proves the visible toolbar renders Codigo, Congelar, green play, and overflow actions.',
    jsonb_build_object('presentationOnly', true),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('evidence:NodeFloatingToolbar:view:372')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'EV-CANVAS-NODE-FLOATING-TOOLBAR-VIEWPORT',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'RenderCanvasNodeFloatingToolbar',
    'node-left-click',
    'Viewport integration proves left-click opens the toolbar and pane/background context gestures close it.',
    jsonb_build_object('userVisible', true),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('evidence:NodeFloatingToolbar:viewport:372')
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

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'EV-WEB-CANVAS-NODE-FLOATING-TOOLBAR-MODEL',
    'web.component.canvas.NodeFloatingToolbar',
    'test',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts',
    'passing',
    jsonb_build_object('scope', 'node floating toolbar model'),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('EV-WEB-CANVAS-NODE-FLOATING-TOOLBAR-MODEL:372')
  ),
  (
    'EV-WEB-CANVAS-NODE-FLOATING-TOOLBAR-PRESENTATION',
    'web.component.canvas.NodeFloatingToolbar',
    'test',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'passing',
    jsonb_build_object('scope', 'node floating toolbar view and viewport integration'),
    'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
    md5('EV-WEB-CANVAS-NODE-FLOATING-TOOLBAR-PRESENTATION:372')
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts#CanvasNodeFloatingToolbarAction'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts#CanvasNodeFloatingToolbarActionId'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts#CanvasNodeFloatingToolbarActionTone'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts#CanvasNodeFloatingToolbarModel'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts#BuildCanvasNodeFloatingToolbarModelArgs'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts#buildCanvasNodeFloatingToolbarModel'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx#CanvasNodeFloatingToolbarView'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx#CanvasNodeFloatingToolbarViewProps')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
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
        ('tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql')
    ) surfaces(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'nodeFloatingToolbar', jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.NodeFloatingToolbar',
        'rail', 'RenderCanvasNodeFloatingToolbar',
        'usesExistingExecutionSelectionCommand', true,
        'doesNotStartRun', true
      )
    ),
  source_path = 'tools/planning-db/migrations/372_canvas_node_floating_toolbar.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:372'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
