-- Register the draggable, ordered CanvasNodeWorkbenchPanel slice and its
-- shared presentation dependencies as DB-first component evidence.

update planning_query_store.frontend_component_local_components
set
  evidence_refs = jsonb_build_array(
    'EV-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNIT',
    'EV-WEB-CANVAS-NODE-WORKBENCH-DRAGGABLE-OVERLAY',
    'EV-WEB-CANVAS-NODE-WORKBENCH-SHARED-PRESENTATION'
  ),
  raw_component = raw_component || jsonb_build_object(
    'draggableOverlay', true,
    'presentationOrderInvariant', 'editable identity appears before readonly facts in the contextual workbench',
    'duplicateRowPolicy', 'workbench general omits readonly facts already editable or covered by a specific section',
    'sharedPresentationDependencies', jsonb_build_array(
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/components/inspector/NodePropertySectionView.tsx'
    )
  ),
  source_path = 'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
  source_content_sha256 = md5('web.component.canvas.CanvasNodeWorkbenchPanel:587'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchPanel';

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
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'contextual workbench overlay gating and mouse drag lifecycle',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    md5('CanvasNodeWorkbenchOverlay.test.tsx:587')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'component',
    'NodePropertiesTabs',
    jsonb_build_object(
      'ownership', 'shared-presentation-dependency',
      'usedBy', 'CanvasNodeWorkbenchPanel',
      'role', 'tab template and overflow menu for node property sections'
    ),
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    md5('NodePropertiesTabs.tsx:CanvasNodeWorkbenchPanel:587')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'component',
    'NodePropertySectionView',
    jsonb_build_object(
      'ownership', 'shared-presentation-dependency',
      'usedBy', 'CanvasNodeWorkbenchPanel',
      'role', 'section body template with explicit editable-slot placement'
    ),
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    md5('NodePropertySectionView.tsx:CanvasNodeWorkbenchPanel:587')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'primary workbench tabs and More overflow presentation',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    md5('NodePropertiesTabs.primarySections.test.tsx:CanvasNodeWorkbenchPanel:587')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'node property section rendering and editable slot placement',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    md5('NodePropertySectionView.test.tsx:CanvasNodeWorkbenchPanel:587')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
    'EV-WEB-CANVAS-NODE-WORKBENCH-DRAGGABLE-OVERLAY',
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'test',
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'contextual workbench moves by mouse drag and does not leave readonly duplicate source target rows in General'
    ),
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    md5('EV-WEB-CANVAS-NODE-WORKBENCH-DRAGGABLE-OVERLAY:587')
  ),
  (
    'EV-WEB-CANVAS-NODE-WORKBENCH-SHARED-PRESENTATION',
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'test',
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/components/inspector/NodePropertySectionView.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'shared inspector presentation templates keep workbench tab and section placement semantics'
    ),
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    md5('EV-WEB-CANVAS-NODE-WORKBENCH-SHARED-PRESENTATION:587')
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
