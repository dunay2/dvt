-- Reconcile the imported NodeWorkbench ownership rows after
-- NodePropertiesTabs became an owned presentation component. Migration 526
-- moves local ownership; this migration removes the imported base rows that
-- would otherwise keep NodeWorkbench as a duplicate file owner in existing DBs.

delete from planning_query_store.frontend_component_files
where component_id = 'web.component.canvas.NodeWorkbench'
  and (
    (file_path = 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx'
      and file_role = 'component')
    or
    (file_path = 'apps/web/src/app/components/inspector/NodePropertySectionView.tsx'
      and file_role = 'component')
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
values (
  'web.component.canvas.NodeWorkbench',
  'EV-CANVAS-NODE-WORKBENCH-NODE-PROPERTIES-TABS-IMPORTED-OWNERSHIP-RECONCILED',
  'architecture-test',
  'current',
  'pnpm planning:db:query frontend-component-files --component web.component.canvas.NodeWorkbench --limit 120',
  'InspectCanvasNodeProperties',
  'node-workbench',
  'NodeWorkbench no longer exposes imported ownership rows for NodePropertiesTabs presentation files after the NodePropertiesTabs leaf component split.',
  jsonb_build_object(
    'duplicateImportedFileOwnershipRemoved', true,
    'semanticOwner', 'web.component.canvas.NodeWorkbench',
    'leafOwner', 'web.component.canvas.NodePropertiesTabs',
    'reconciledFiles', jsonb_build_array(
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/components/inspector/NodePropertySectionView.tsx'
    )
  ),
  'tools/planning-db/migrations/527_node_properties_tabs_imported_ownership_reconcile.sql',
  md5('evidence:NodeWorkbench:node-properties-tabs-imported-ownership-reconciled:527')
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
