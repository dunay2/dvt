-- Record the graph-node card interaction hardening evidence without changing
-- component ownership: NodeFloatingToolbar and GraphNodeHealthPopover remain
-- separate leaf components hosted by CanvasViewport.

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
    'EV-CANVAS-NODE-FLOATING-TOOLBAR-HEALTH-POPOVER-EXCLUSION',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'RenderCanvasNodeFloatingToolbar',
    'canvas-viewport',
    'Opening GraphNodeHealthPopover closes NodeFloatingToolbar so node surfaces do not overlap.',
    jsonb_build_object(
      'relatedComponentId', 'web.component.canvas.GraphNodeHealthPopover',
      'relatedRails', jsonb_build_array(
        'OpenCanvasNodeHealthPopover',
        'CloseCanvasNodeHealthPopover'
      ),
      'noOrphanedToolbar', true,
      'noCompetingNodeSurface', true
    ),
    'tools/planning-db/migrations/382_graph_node_card_interaction_hardening.sql',
    md5('evidence:NodeFloatingToolbar:GraphNodeHealthPopover:382')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-NODE-REMOVAL',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'CloseCanvasNodeHealthPopover',
    'canvas-viewport',
    'Removing the owning graph node clears the health popover and leaves no orphaned node surface.',
    jsonb_build_object(
      'relatedComponentId', 'web.component.canvas.NodeFloatingToolbar',
      'relatedRail', 'RenderCanvasNodeFloatingToolbar',
      'noOrphanedPopover', true,
      'nodeRemovalLifecycle', true
    ),
    'tools/planning-db/migrations/382_graph_node_card_interaction_hardening.sql',
    md5('evidence:GraphNodeHealthPopover:node-removal:382')
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
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('tools/planning-db/migrations/382_graph_node_card_interaction_hardening.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('tools/planning-db/migrations/382_graph_node_card_interaction_hardening.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardInteractionHardening',
      jsonb_build_object(
        'status', 'implemented',
        'componentIds', jsonb_build_array(
          'web.component.canvas.GraphNodeCard',
          'web.component.canvas.NodeFloatingToolbar',
          'web.component.canvas.GraphNodeHealthPopover'
        ),
        'rails', jsonb_build_array(
          'RenderCanvasGraphNodeCard',
          'RenderCanvasNodeFloatingToolbar',
          'OpenCanvasNodeHealthPopover',
          'CloseCanvasNodeHealthPopover'
        ),
        'evidence', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'
        ),
        'noOrphanedNodeSurfaces', true
      )
    ),
  source_path = 'tools/planning-db/migrations/382_graph_node_card_interaction_hardening.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardInteractionHardening:382'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
