-- Reconcile local Planning DBs that already applied migration 529 before the
-- generic fixed-inspector presentation test was added to the retired set.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeWorkbench',
  'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx',
  'test',
  null,
  jsonb_build_object(
    'retiredForPresentationOwnership', true,
    'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
    'retiredReason', 'Generic fixed inspector presentation test retired; contextual CanvasNodeWorkbenchPanel and NodePropertiesTabs tests own the remaining coverage.'
  ),
  'tools/planning-db/migrations/530_node_workbench_generic_inspector_test_retirement.sql',
  md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.test.tsx:530')
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
  'EV-CANVAS-NODE-WORKBENCH-GENERIC-INSPECTOR-TEST-RETIRED',
  'architecture-test',
  'current',
  'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
  'OpenNodeWorkbench',
  'node-workbench',
  'The generic fixed inspector presentation test is retired and replaced by contextual NodeWorkbench coverage.',
  jsonb_build_object(
    'retiredForPresentationOwnership', true,
    'retiredFile', 'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx',
    'replacementEvidence', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts'
    )
  ),
  'tools/planning-db/migrations/530_node_workbench_generic_inspector_test_retirement.sql',
  md5('evidence:NodeWorkbench:generic-inspector-test-retired:530')
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
