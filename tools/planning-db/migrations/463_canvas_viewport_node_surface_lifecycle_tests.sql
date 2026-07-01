-- Reconcile CanvasViewport ownership for node-local surface lifecycle tests.
-- The same tests prove leaf component behavior, but CanvasViewport owns the
-- host lifecycle that injects, opens, closes, and retires those surfaces.

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
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'integration-test',
    null,
    jsonb_build_object(
      'rail', 'RenderCanvasContextualGraphSurface',
      'hostedSurface', 'web.component.canvas.NodeFloatingToolbar',
      'proves', jsonb_build_array(
        'left click opens the node floating toolbar from CanvasViewport',
        'pane click closes the node floating toolbar',
        'node removal retires the node floating toolbar',
        'opening operational details clears the node floating toolbar'
      ),
      'hostOwnership', true
    ),
    'tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql',
    md5('file:CanvasViewport:node-floating-toolbar-lifecycle-test:463')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
    'integration-test',
    null,
    jsonb_build_object(
      'rail', 'RenderCanvasContextualGraphSurface',
      'hostedSurface', 'web.component.canvas.GraphNodeHealthPopover',
      'proves', jsonb_build_array(
        'CanvasViewport injects onOpenOperationalDetails into rendered nodes',
        'operational rail opens the node health popover through the host port',
        'pane click closes the node health popover',
        'Escape closes the node health popover',
        'node selection change closes stale node health popovers'
      ),
      'hostOwnership', true
    ),
    'tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql',
    md5('file:CanvasViewport:node-operational-rail-lifecycle-test:463')
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
    'web.component.canvas.CanvasViewport',
    'EV-CANVAS-VIEWPORT-NODE-FLOATING-TOOLBAR-LIFECYCLE',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'RenderCanvasContextualGraphSurface',
    'canvas-viewport-node-surface-host',
    'CanvasViewport owns node floating toolbar open, close, and owner-removal lifecycle without leaving orphaned toolbar surfaces.',
    jsonb_build_object(
      'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
      'noOrphanedNodeSurfaces', true,
      'leafComponent', 'web.component.canvas.NodeFloatingToolbar',
      'hostComponent', 'web.component.canvas.CanvasViewport'
    ),
    'tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql',
    md5('evidence:CanvasViewport:node-floating-toolbar-lifecycle:463')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'EV-CANVAS-VIEWPORT-NODE-HEALTH-POPOVER-LIFECYCLE',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
    'RenderCanvasContextualGraphSurface',
    'canvas-viewport-node-surface-host',
    'CanvasViewport owns operational detail injection and node health popover lifecycle without leaving stale popovers.',
    jsonb_build_object(
      'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
      'noOrphanedNodeSurfaces', true,
      'leafComponent', 'web.component.canvas.GraphNodeHealthPopover',
      'hostComponent', 'web.component.canvas.CanvasViewport'
    ),
    'tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql',
    md5('evidence:CanvasViewport:node-health-popover-lifecycle:463')
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
      values
        ('EV-CANVAS-VIEWPORT-NODE-FLOATING-TOOLBAR-LIFECYCLE'),
        ('EV-CANVAS-VIEWPORT-NODE-HEALTH-POPOVER-LIFECYCLE')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'nodeSurfaceLifecycleTests',
      jsonb_build_object(
        'status', 'implemented',
        'rail', 'RenderCanvasContextualGraphSurface',
        'hostedComponents', jsonb_build_array(
          'web.component.canvas.NodeFloatingToolbar',
          'web.component.canvas.GraphNodeHealthPopover'
        ),
        'hostOwnsLifecycle', true,
        'leafComponentsOwnPresentation', true
      )
    ),
  source_path = 'tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql',
  source_content_sha256 = md5('component:CanvasViewport:node-surface-lifecycle-tests:463'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasViewport';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'canvasViewportNodeSurfaceLifecycleTests',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.CanvasViewport',
        'rail', 'RenderCanvasContextualGraphSurface',
        'hostedComponents', jsonb_build_array(
          'web.component.canvas.NodeFloatingToolbar',
          'web.component.canvas.GraphNodeHealthPopover'
        ),
        'noOrphanedNodeSurfaces', true
      )
    ),
  source_path = 'tools/planning-db/migrations/463_canvas_viewport_node_surface_lifecycle_tests.sql',
  source_content_sha256 = md5('E-CANVAS-UXDB-COMPONENT-SLICES-1:CanvasViewport:node-surface-lifecycle-tests:463'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-UXDB-COMPONENT-SLICES-1'
  and rail_name = 'RenderCanvasContextualGraphSurface';
