-- Record the GraphNodeHealthPopover outside-click lifecycle evidence without
-- changing file ownership: CanvasViewport remains the host of lifecycle state,
-- while GraphNodeHealthPopover owns only the supplied detail presentation.

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
  'web.component.canvas.GraphNodeHealthPopover',
  'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-OUTSIDE-DISMISS',
  'integration-test',
  'current',
  'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
  'CloseCanvasNodeHealthPopover',
  'canvas-viewport',
  'CanvasViewport closes GraphNodeHealthPopover when the user clicks outside the viewport host while preserving inside-viewport interactions.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected graph-node-health-popover to be null after outside pointerdown',
    'hostComponentId', 'web.component.canvas.CanvasViewport',
    'hostOwnsLifecycleFiles', true,
    'outsidePointerDismissal', true,
    'leafPresentationOwnershipUnchanged', true
  ),
  'tools/planning-db/migrations/425_graph_node_health_popover_outside_dismiss.sql',
  md5('evidence:GraphNodeHealthPopover:outside-dismiss:425')
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

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeHealthPopoverOutsideDismiss',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeHealthPopover',
        'hostComponentId', 'web.component.canvas.CanvasViewport',
        'rail', 'CloseCanvasNodeHealthPopover',
        'rule', 'outside document pointerdown closes the hosted health popover without moving lifecycle file ownership'
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/425_graph_node_health_popover_outside_dismiss.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/425_graph_node_health_popover_outside_dismiss.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/425_graph_node_health_popover_outside_dismiss.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeHealthPopover:outside-dismiss:425'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
