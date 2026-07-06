-- Retire the fixed inspector surfaces after the contextual NodeWorkbench became
-- the product owner for node-detail presentation. The local retired rows keep
-- imported governance snapshots from reintroducing the old fixed-panel files.

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
    'apps/web/src/app/components/InspectorPanel.tsx',
    'component',
    'InspectorPanel',
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'retiredReason', 'Fixed passive inspector shell removed; contextual CanvasNodeWorkbenchPanel owns node-detail presentation.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:InspectorPanel.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/InspectorPanel.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'retiredReason', 'InspectorPanel tests retired with the removed fixed shell; NodePropertiesTabs and CanvasNodeWorkbenchPanel tests own the remaining coverage.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:InspectorPanel.test.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx',
    'component',
    'CanvasInspectorPanel',
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'retiredReason', 'Fixed CanvasInspectorPanel removed; CanvasNodeWorkbenchOverlay hosts contextual NodeWorkbench.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx',
    'test-support',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'retiredReason', 'Fixed inspector test harness removed with the obsolete surface.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.test.support.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.authoring.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'retiredReason', 'Authoring coverage moved to contextual NodeWorkbench tests.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.authoring.test.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.canvasProperties.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasSettingsDialog',
      'retiredReason', 'Canvas properties do not belong to node-detail workbench; fixed inspector test retired with the obsolete surface.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.canvasProperties.test.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.metadata.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'retiredReason', 'Node metadata coverage is owned by CanvasNodeWorkbenchPanel and NodePropertiesTabs tests.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.metadata.test.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.modelerActions.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'retiredReason', 'Modeler action coverage is owned by contextual node workbench and graph interaction tests.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.modelerActions.test.tsx:529')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.pluginTabs.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredByComponentId', 'web.component.canvas.NodePropertiesTabs',
      'retiredReason', 'Plugin tab coverage is owned by NodePropertiesTabs and contextual NodeWorkbench tests.'
    ),
    'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
    md5('file-retirement:NodeWorkbench:CanvasInspectorPanel.pluginTabs.test.tsx:529')
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
  'EV-CANVAS-NODE-WORKBENCH-FIXED-INSPECTOR-FILES-RETIRED',
  'architecture-test',
  'current',
  'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
  'OpenNodeWorkbench',
  'node-workbench',
  'Fixed inspector source and tests are retired after the contextual NodeWorkbench overlay became the owned presentation path.',
  jsonb_build_object(
    'retiredForPresentationOwnership', true,
    'retiredFiles', jsonb_build_array(
      'apps/web/src/app/components/InspectorPanel.tsx',
      'apps/web/src/app/components/InspectorPanel.test.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.authoring.test.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.canvasProperties.test.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.metadata.test.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.modelerActions.test.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.pluginTabs.test.tsx'
    )
  ),
  'tools/planning-db/migrations/529_node_workbench_fixed_inspector_retirement.sql',
  md5('evidence:NodeWorkbench:fixed-inspector-files-retired:529')
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
