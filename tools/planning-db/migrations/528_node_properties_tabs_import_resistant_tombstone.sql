-- Keep the NodePropertiesTabs leaf ownership import-resistant. Governance DB
-- imports can repopulate the original inventory row under NodeWorkbench; these
-- local retired rows take precedence in frontend_component_file_query and keep
-- the old ownership hidden without losing the audit trail.

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
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'component',
    'NodePropertiesTabs',
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.NodePropertiesTabs',
      'retiredReason', 'NodePropertiesTabs is an owned presentation leaf; NodeWorkbench depends on it but does not own its template file.'
    ),
    'tools/planning-db/migrations/528_node_properties_tabs_import_resistant_tombstone.sql',
    md5('file-retirement:NodeWorkbench:NodePropertiesTabs.tsx:528')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'component',
    'NodePropertySectionView',
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.NodePropertiesTabs',
      'retiredReason', 'NodePropertySectionView is owned by the NodePropertiesTabs presentation leaf; NodeWorkbench depends on the leaf API only.'
    ),
    'tools/planning-db/migrations/528_node_properties_tabs_import_resistant_tombstone.sql',
    md5('file-retirement:NodeWorkbench:NodePropertySectionView.tsx:528')
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
values (
  'web.component.canvas.NodeWorkbench',
  'EV-CANVAS-NODE-WORKBENCH-NODE-PROPERTIES-TABS-IMPORT-RESISTANT',
  'architecture-test',
  'current',
  'pnpm verify:prepush',
  'InspectCanvasNodeProperties',
  'node-workbench',
  'NodeWorkbench ownership retirement for NodePropertiesTabs survives governance DB import because the retirement is expressed as local file authority, not only as a base-table delete.',
  jsonb_build_object(
    'importResistant', true,
    'retiredForPresentationOwnership', true,
    'leafOwner', 'web.component.canvas.NodePropertiesTabs',
    'retiredFiles', jsonb_build_array(
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/components/inspector/NodePropertySectionView.tsx'
    )
  ),
  'tools/planning-db/migrations/528_node_properties_tabs_import_resistant_tombstone.sql',
  md5('evidence:NodeWorkbench:node-properties-tabs-import-resistant:528')
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
