-- DB-first registration for the Node Workbench source metadata projection slice.
-- The slice removes the view-local DVT column option helper path and registers
-- the shared workbench read-model surface that now owns selectable input-column
-- projection.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
  'E-CANVAS-NODE-WORKBENCH-1',
  'Canvas node workbench source metadata projection',
  'Frontend / Canvas',
  'implemented',
  'Imported warehouse sources carried catalog columns but dropped source row counts before they reached the persisted graph draft. DVT transform column selection also lived in a view-local helper even though NodeWorkbench and DVT authoring need the same vocabulary. This slice preserves catalog-owned source statistics and moves the selectable-column projection into the NodeWorkbench read-model boundary.',
  'boundary_drift',
  'ImportWarehouseSources;InspectCanvasNodeProperties',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'component',
    'web.component.canvas.NodeWorkbench',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'component',
    'web.component.canvas.DvtAuthoringFields',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'query',
    'InspectCanvasNodeProperties',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'flow',
    'ImportWarehouseSources',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'path',
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'path',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'path',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'path',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SOURCE-METADATA-20260626',
    'path',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
    'may_delete',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

delete from planning_query_store.frontend_component_local_files
where file_path in (
  'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
  'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
);

delete from planning_query_store.frontend_component_files
where file_path in (
  'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
  'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
);

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
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'model',
    'buildDvtTransformColumnOptions',
    jsonb_build_object(
      'role', 'DVT transform selectable input-column read model',
      'responsibility', 'projects upstream source column metadata and selectedColumns state for NodeWorkbench and DVT authoring without JSX ownership',
      'rails', jsonb_build_array('InspectCanvasNodeProperties'),
      'forbiddenResponsibilities', jsonb_build_array(
        'rendering controls',
        'mutating graph drafts',
        'inventing source metadata when upstream columns are absent'
      )
    ),
    'tools/planning-db/migrations/315_canvas_node_workbench_source_metadata_projection.sql',
    md5('dvtTransformColumnModel#buildDvtTransformColumnOptions:315')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'DVT transform input columns are projected from connected source metadata with selected/available state'
    ),
    'tools/planning-db/migrations/315_canvas_node_workbench_source_metadata_projection.sql',
    md5('dvtTransformColumnModel.test.ts:315')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'model',
    'buildNodePropertiesReadModel',
    jsonb_build_object(
      'role', 'Node Workbench properties read model',
      'responsibility', 'surfaces source metrics, columns, test semantics, graph IO, and DVT transform input-column selection from CanonicalNode metadata',
      'rails', jsonb_build_array('InspectCanvasNodeProperties')
    ),
    'tools/planning-db/migrations/315_canvas_node_workbench_source_metadata_projection.sql',
    md5('nodePropertiesReadModel#dvtInputColumns:315')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'NodePropertiesReadModel projects DVT transform input columns with source, reference, and selection state'
    ),
    'tools/planning-db/migrations/315_canvas_node_workbench_source_metadata_projection.sql',
    md5('nodePropertiesReadModel.test.ts#dvtInputColumns:315')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.NodeWorkbench',
    'InspectCanvasNodeProperties',
    'query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Read node properties, columns, metadata, tests, IO, code, and selectable DVT transform input columns for the contextual Node Workbench.',
      'owner', 'NodeWorkbench',
      'readModel', 'NodePropertiesReadModel',
      'negativeTests', jsonb_build_array(
        'nodePropertiesReadModel.test.ts keeps explicit empty states instead of fabricating unavailable records',
        'dvtTransformColumnModel.test.ts does not fabricate column options when upstream metadata is absent'
      )
    ),
    'tools/planning-db/migrations/315_canvas_node_workbench_source_metadata_projection.sql',
    md5('NodeWorkbench:InspectCanvasNodeProperties:315')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
