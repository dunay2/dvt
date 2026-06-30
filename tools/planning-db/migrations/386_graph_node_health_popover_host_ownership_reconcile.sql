-- Reconcile GraphNodeHealthPopover ownership. CanvasViewport and
-- CanvasViewportSurfaceView host the popover lifecycle, but the files are
-- owned by CanvasViewport. The popover keeps its own leaf files and declares
-- the host relationship in component metadata/evidence instead of claiming
-- duplicate file ownership.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.GraphNodeHealthPopover'
  and file_path in (
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'
  )
  and file_role in ('host-state', 'host-render');

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'fileOwnershipModel',
      'owned-leaf-component-files',
      'hostRelationship',
      jsonb_build_object(
        'hostComponentId',
        'web.component.canvas.CanvasViewport',
        'relationshipKind',
        'hosted-surface',
        'hostOwnsLifecycleFiles',
        true,
        'hostedComponentOwnsPresentationFiles',
        true
      )
    ),
  source_path = 'tools/planning-db/migrations/386_graph_node_health_popover_host_ownership_reconcile.sql',
  source_content_sha256 = md5('web.component.canvas.GraphNodeHealthPopover:host-ownership-reconcile:386'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover';

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
    'web.component.canvas.GraphNodeHealthPopover',
    'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-HOST-OWNERSHIP-RECONCILED',
    'architecture-test',
    'current',
    'pnpm planning:db:query canvas-component-registry-drift --limit 80',
    'RenderCanvasNodeHealthPopover',
    'canvas-viewport',
    'GraphNodeHealthPopover no longer claims CanvasViewport host files as owned files; host relation is metadata/evidence only.',
    jsonb_build_object(
      'duplicateFileOwnershipRemoved', true,
      'hostComponentId', 'web.component.canvas.CanvasViewport',
      'ownedFilesRemainLeafOnly', true,
      'reconciledFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/CanvasViewport.tsx',
        'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'
      )
    ),
    'tools/planning-db/migrations/386_graph_node_health_popover_host_ownership_reconcile.sql',
    md5('evidence:GraphNodeHealthPopover:host-ownership-reconciled:386')
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
