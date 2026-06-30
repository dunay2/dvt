-- Reconcile NodeWorkbench duplicate file ownership. NodeWorkbench remains the
-- semantic workbench capability, but the concrete panel and section-strategy
-- source files are owned by their leaf components. This keeps the registry
-- one-owner-per-file invariant without hiding the dependency.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.NodeWorkbench'
  and (
    (file_path = 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
      and file_role = 'view')
    or
    (file_path = 'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts'
      and file_role = 'presenter')
  );

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
    'web.component.canvas.NodeWorkbench',
    'EV-CANVAS-NODE-WORKBENCH-DUPLICATE-OWNERSHIP-RECONCILED',
    'architecture-test',
    'current',
    'pnpm planning:db:query canvas-component-registry-drift --limit 80',
    'InspectCanvasNodeProperties',
    'node-workbench',
    'NodeWorkbench no longer claims leaf-owned CanvasNodeWorkbenchPanel or CanvasSurfaceStrategy files.',
    jsonb_build_object(
      'duplicateFileOwnershipRemoved', true,
      'semanticOwner', 'web.component.canvas.NodeWorkbench',
      'leafOwners', jsonb_build_array(
        'web.component.canvas.CanvasNodeWorkbenchPanel',
        'web.component.canvas.CanvasSurfaceStrategy'
      ),
      'reconciledFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts'
      )
    ),
    'tools/planning-db/migrations/388_node_workbench_duplicate_file_ownership_reconcile.sql',
    md5('evidence:NodeWorkbench:duplicate-file-ownership-reconciled:388')
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
