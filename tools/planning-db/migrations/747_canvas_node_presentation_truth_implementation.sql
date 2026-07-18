-- Reconcile the selected-node presentation implementation with the DB-first
-- design. The migration retires only the ambiguous local read-model aggregate;
-- the visual workbench host remains an active composite component.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'command', 'CoordinateCanvasNodeContextSurface', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'query', 'ResolveCanvasViewCopy', 'may_reference', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts',
  public_contract = 'CanvasNodePresentationTruth;buildCanvasNodePresentationTruth',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH';

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
  public_contract = 'CanvasNodeContextSurfaceState;reduceCanvasNodeContextSurface',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR';

update architecture.component
set
  repo_path = 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
  public_contract = 'NodePropertiesReadModel;buildNodePropertiesReadModel',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL';

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  (
    'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
    'Canvas DBT test rows read model',
    'module',
    'application',
    'Frontend / Canvas inspector',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
    'DbtTestTableRow;buildDbtTestRows',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL'
  ),
  (
    'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL',
    'Canvas DVT transform column model',
    'module',
    'application',
    'Frontend / Canvas inspector',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'TransformColumnOption;buildTransformColumnOptions',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL'
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

update architecture.component_responsibility
set
  responsibility = 'Project canonical node facts into passive property sections while preserving declared and inherited provenance and inline or workspace-file code authority.',
  reason_to_change = 'The node-properties section composition or provenance-preserving projection policy changes.',
  ddd_owner = 'NodePropertiesReadModel',
  status = 'approved'
where component_id = 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL';

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values
  (
    'RESP-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
    'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
    'Project DBT manifest, connected test nodes, and fallback metadata into passive test rows.',
    'The DBT test semantics or test-row vocabulary changes.',
    'DbtTestRowsReadModel',
    'approved'
  ),
  (
    'RESP-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL',
    'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL',
    'Project connected DVT input metadata and selected refs into selectable transform-column options.',
    'The DVT transform input-column selection semantics change.',
    'DvtTransformColumnModel',
    'approved'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction, negative_tests, status
)
values
  (
    'PORT-WEB-CANVAS-DBT-TEST-ROWS-PROJECTION',
    'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
    'buildDbtTestRows',
    'query',
    'inbound',
    array[
      'a DBT test row loses its model or column target',
      'fallback metadata is presented as authoritative manifest evidence'
    ],
    'approved'
  ),
  (
    'PORT-WEB-CANVAS-DVT-TRANSFORM-COLUMN-PROJECTION',
    'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL',
    'buildTransformColumnOptions',
    'query',
    'inbound',
    array[
      'missing upstream metadata fabricates selectable columns',
      'selected refs are silently discarded'
    ],
    'approved'
  )
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodePresentationTruth',
    'CanvasNodePresentationTruth',
    'query-view',
    'partial',
    'create',
    'Frontend / Canvas read models',
    'Project one provenance-preserving semantic truth for node columns and code authority without rendering, localization, or file-byte loading.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
      'dddObject', 'CanvasNodePresentationTruth',
      'invariants', jsonb_build_array(
        'declared and inherited column sets remain distinct',
        'visible column count is derived once for every consumer',
        'workspace-file authority is not reported as absent inline SQL',
        'localized display copy is owned by CanvasCopyCatalog'
      ),
      'gapModel', 'relational'
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('component:CanvasNodePresentationTruth:747')
  ),
  (
    'web.component.canvas.CanvasNodeContextSurfaceCoordinator',
    'CanvasNodeContextSurfaceCoordinator',
    'state-view',
    'partial',
    'create',
    'Frontend / Canvas interaction',
    'Reduce selected-node contextual events to one toolbar, health, or idle posture while external workbench and code surfaces take exclusive priority.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
      'stateSet', jsonb_build_array('idle', 'toolbar', 'health'),
      'externalExclusiveSurfaces', jsonb_build_array('node-workbench', 'node-code', 'project-code'),
      'invariant', 'cardinality(active contextual node surfaces) <= 1',
      'gapModel', 'relational'
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('component:CanvasNodeContextSurfaceCoordinator:747')
  ),
  (
    'web.component.canvas.NodePropertiesReadModel',
    'NodePropertiesReadModel',
    'query-view',
    'partial',
    'extract',
    'Frontend / Canvas inspector',
    'Compose passive node-property sections from canonical node truth and delegated DBT-test and DVT-column projections without rendering JSX or executing authoring commands.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL',
      'presentationComponentId', 'web.component.canvas.NodePropertiesTabs',
      'hostComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
      'delegates', jsonb_build_array(
        'web.component.canvas.DbtTestRowsReadModel',
        'web.component.canvas.DvtTransformColumnModel'
      ),
      'gapModel', 'relational'
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('component:NodePropertiesReadModel:747')
  ),
  (
    'web.component.canvas.DbtTestRowsReadModel',
    'DbtTestRowsReadModel',
    'query-view',
    'current',
    'extract',
    'Frontend / Canvas inspector',
    'Project DBT tests into target-aware passive rows without presentation markup or graph mutation.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
      'parentReadModel', 'web.component.canvas.NodePropertiesReadModel'
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('component:DbtTestRowsReadModel:747')
  ),
  (
    'web.component.canvas.DvtTransformColumnModel',
    'DvtTransformColumnModel',
    'query-view',
    'current',
    'extract',
    'Frontend / Canvas inspector',
    'Project upstream DVT metadata and selected refs into transform-column options without presentation markup or graph mutation.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL',
      'parentReadModel', 'web.component.canvas.NodePropertiesReadModel'
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('component:DvtTransformColumnModel:747')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'NodeWorkbench',
    'canvas-inspector',
    'retire',
    'retire',
    'Frontend / Canvas inspector',
    'Retired ambiguous read-model aggregate retained only as a DB tombstone.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'retiredReason', 'Three independently changing read models were grouped under one component identity.',
      'supersededBy', jsonb_build_array(
        'web.component.canvas.NodePropertiesReadModel',
        'web.component.canvas.DbtTestRowsReadModel',
        'web.component.canvas.DvtTransformColumnModel'
      ),
      'ownsExecutableFiles', false,
      'ownsRails', false
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('component:NodeWorkbench:retired:747')
  )
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  component_status = 'retire',
  reuse_decision = 'retire',
  responsibility = 'Retired ambiguous read-model aggregate retained only as a DB tombstone.',
  plugin_scope = null,
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = jsonb_build_object(
    'dbFirst', true,
    'retiredReason', 'Three independently changing read models were grouped under one component identity.',
    'supersededBy', jsonb_build_array(
      'web.component.canvas.NodePropertiesReadModel',
      'web.component.canvas.DbtTestRowsReadModel',
      'web.component.canvas.DvtTransformColumnModel'
    ),
    'ownsExecutableFiles', false,
    'ownsRails', false
  ),
  source_path = 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
  source_content_sha256 = md5('component:NodeWorkbench:retired:747'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeWorkbench';

delete from planning_query_store.frontend_component_local_files
where component_id in (
  'web.component.canvas.CanvasNodePresentationTruth',
  'web.component.canvas.CanvasNodeContextSurfaceCoordinator',
  'web.component.canvas.NodePropertiesReadModel',
  'web.component.canvas.DbtTestRowsReadModel',
  'web.component.canvas.DvtTransformColumnModel'
) or (
  component_id = 'web.component.canvas.NodeWorkbench'
  and file_path in (
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts'
  )
);

delete from planning_query_store.frontend_component_files
where component_id = 'web.component.canvas.NodeWorkbench'
  and file_path in (
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts'
  );

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  ('web.component.canvas.CanvasNodePresentationTruth', 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts', 'contract', 'CanvasNodePresentationTruth;isCanvasNodePresentationTruth', jsonb_build_object('ownership', 'owned', 'localizedCopy', false), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:canvasNodePresentationTruth.contract:747')),
  ('web.component.canvas.CanvasNodePresentationTruth', 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'read-model', 'buildCanvasNodePresentationTruth', jsonb_build_object('ownership', 'owned', 'pure', true), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:canvasNodePresentationTruth:747')),
  ('web.component.canvas.CanvasNodePresentationTruth', 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'column provenance and code authority'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:canvasNodePresentationTruth.test:747')),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts', 'state-model', 'reduceCanvasNodeContextSurface', jsonb_build_object('ownership', 'owned', 'pure', true), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:canvasNodeContextSurfaceModel:747')),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'exclusive contextual surface lifecycle'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:canvasNodeContextSurfaceModel.test:747')),
  ('web.component.canvas.NodePropertiesReadModel', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts', 'read-model', 'buildNodePropertiesReadModel', jsonb_build_object('ownership', 'owned', 'rail', 'InspectCanvasNodeProperties'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:nodePropertiesReadModel:747')),
  ('web.component.canvas.NodePropertiesReadModel', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'passive property sections and presentation truth'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:nodePropertiesReadModel.test:747')),
  ('web.component.canvas.DbtTestRowsReadModel', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts', 'read-model', 'buildDbtTestRows', jsonb_build_object('ownership', 'owned', 'rail', 'InspectCanvasNodeProperties'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:dbtTestRowsReadModel:747')),
  ('web.component.canvas.DbtTestRowsReadModel', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'target-aware DBT test rows'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:dbtTestRowsReadModel.test:747')),
  ('web.component.canvas.DvtTransformColumnModel', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'read-model', 'buildTransformColumnOptions', jsonb_build_object('ownership', 'owned', 'rail', 'InspectCanvasNodeProperties'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:dvtTransformColumnModel:747')),
  ('web.component.canvas.DvtTransformColumnModel', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'DVT upstream column options without fabrication'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:dvtTransformColumnModel.test:747')),
  ('web.component.canvas.CanvasCopyCatalog', 'apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts', 'copy-contract', 'CanvasNodePresentationCopy;isCanvasNodePresentationCopy', jsonb_build_object('ownership', 'owned', 'rail', 'ResolveCanvasViewCopy'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:canvasNodePresentationCopy.contract:747')),
  ('web.component.canvas.CanvasCopyCatalog', 'apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts', 'copy-adapter', 'buildCanvasNodePresentationCopy', jsonb_build_object('ownership', 'owned', 'rail', 'ResolveCanvasViewCopy'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('file:canvasNodePresentationCopy:747'))
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_local_cq_rails
where component_id = 'web.component.canvas.NodeWorkbench';

delete from planning_query_store.frontend_component_cq_rails
where component_id = 'web.component.canvas.NodeWorkbench';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodePresentationTruth',
    'ProjectCanvasNodePresentationTruth',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'name', 'ProjectCanvasNodePresentationTruth',
      'type', 'query',
      'dddObject', 'CanvasNodePresentationTruth',
      'applicationPort', 'buildCanvasNodePresentationTruth',
      'adapterSurface', 'CanvasViewport;GraphNodeCardStrategy;NodePropertiesReadModel',
      'negativeTests', jsonb_build_array(
        'do not load workspace file bytes',
        'do not localize labels',
        'do not collapse inherited columns into declared columns'
      )
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('rail:CanvasNodePresentationTruth:ProjectCanvasNodePresentationTruth:747')
  ),
  (
    'web.component.canvas.CanvasNodeContextSurfaceCoordinator',
    'CoordinateCanvasNodeContextSurface',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'name', 'CoordinateCanvasNodeContextSurface',
      'type', 'command',
      'dddObject', 'CanvasNodeContextSurfaceState',
      'applicationPort', 'reduceCanvasNodeContextSurface',
      'adapterSurface', 'CanvasViewport',
      'negativeTests', jsonb_build_array(
        'toolbar remains active while workbench is open',
        'health remains active after node removal',
        'two contextual node surfaces are active simultaneously'
      )
    ),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('rail:CanvasNodeContextSurfaceCoordinator:Coordinate:747')
  ),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'RenderCanvasNodeFloatingToolbar', 'coordination', 'implemented-projection', jsonb_build_object('role', 'exclusive contextual-surface coordination', 'canonicalOwner', 'web.component.canvas.NodeFloatingToolbar'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:context:RenderCanvasNodeFloatingToolbar:747')),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'OpenCanvasNodeHealthPopover', 'coordination', 'implemented-projection', jsonb_build_object('role', 'exclusive contextual-surface coordination', 'canonicalOwner', 'web.component.canvas.GraphNodeHealthPopover'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:context:OpenCanvasNodeHealthPopover:747')),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'CloseCanvasNodeHealthPopover', 'coordination', 'implemented-projection', jsonb_build_object('role', 'exclusive contextual-surface coordination', 'canonicalOwner', 'web.component.canvas.GraphNodeHealthPopover'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:context:CloseCanvasNodeHealthPopover:747')),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'InspectCanvasNodeProperties', 'coordination', 'implemented-projection', jsonb_build_object('role', 'external workbench excludes transient canvas surfaces', 'canonicalOwner', 'NodePropertiesReadModel'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:context:InspectCanvasNodeProperties:747')),
  ('web.component.canvas.NodePropertiesReadModel', 'InspectCanvasNodeProperties', 'query', 'implemented-projection', jsonb_build_object('role', 'canonical node-property read-model owner', 'dddObject', 'NodePropertiesReadModel'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:NodePropertiesReadModel:InspectCanvasNodeProperties:747')),
  ('web.component.canvas.DbtTestRowsReadModel', 'InspectCanvasNodeProperties', 'projection', 'implemented-projection', jsonb_build_object('role', 'DBT test-row projection', 'parentReadModel', 'NodePropertiesReadModel'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:DbtTestRowsReadModel:InspectCanvasNodeProperties:747')),
  ('web.component.canvas.DvtTransformColumnModel', 'InspectCanvasNodeProperties', 'projection', 'implemented-projection', jsonb_build_object('role', 'DVT transform-column projection', 'parentReadModel', 'NodePropertiesReadModel'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:DvtTransformColumnModel:InspectCanvasNodeProperties:747')),
  ('web.component.canvas.CanvasCopyCatalog', 'ResolveCanvasViewCopy', 'local-query', 'implemented-local', jsonb_build_object('purpose', 'Resolve locale-aware Canvas copy including node presentation labels.', 'readModel', 'CanvasViewCopy', 'adapterSurface', 'canvasNodePresentationCopy.ts', 'doesNotOwnSemanticTruth', true), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('rail:CanvasCopyCatalog:ResolveCanvasViewCopy:747'))
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'NodePropertiesReadModel',
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildNodePropertiesReadModel'),
        ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts#buildCanvasNodePresentationTruth')
    ) all_refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'),
        ('apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts'),
        ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts'),
        ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')
    ) all_refs(value)
  ),
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'dddOwner', 'NodePropertiesReadModel',
    'dddObject', 'NodePropertiesReadModel',
    'adapterSurface', 'CanvasNodeWorkbenchPanel;NodePropertiesTabs',
    'ownerReconciledBy', 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql'
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'inspectOwnerReconciled', true,
    'inspectOwner', 'NodePropertiesReadModel'
  ),
  source_path = 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
  source_content_sha256 = repeat(md5('InspectCanvasNodeProperties:NodePropertiesReadModel:747'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties';

delete from planning_query_store.frontend_component_plugin_scopes
where component_id = 'web.component.canvas.NodeWorkbench';

insert into planning_query_store.frontend_component_plugin_scopes (
  component_id, plugin_id, scope_status, raw_scope, source_path,
  source_content_sha256
)
values
  ('web.component.canvas.CanvasNodePresentationTruth', 'dbt', 'current', jsonb_build_object('scopeReason', 'DBT card and workbench consumers share the canonical truth.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:truth:dbt:747')),
  ('web.component.canvas.CanvasNodePresentationTruth', 'dvt', 'current', jsonb_build_object('scopeReason', 'DVT card and workbench consumers share the canonical truth.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:truth:dvt:747')),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'dbt', 'current', jsonb_build_object('scopeReason', 'DBT selected-node surfaces use the same exclusive state machine.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:context:dbt:747')),
  ('web.component.canvas.CanvasNodeContextSurfaceCoordinator', 'dvt', 'current', jsonb_build_object('scopeReason', 'DVT selected-node surfaces use the same exclusive state machine.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:context:dvt:747')),
  ('web.component.canvas.NodePropertiesReadModel', 'dbt', 'current', jsonb_build_object('scopeReason', 'The read model composes DBT node properties.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:properties:dbt:747')),
  ('web.component.canvas.NodePropertiesReadModel', 'dvt', 'current', jsonb_build_object('scopeReason', 'The read model composes DVT node properties.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:properties:dvt:747')),
  ('web.component.canvas.DbtTestRowsReadModel', 'dbt', 'current', jsonb_build_object('scopeReason', 'DBT-specific test semantics only.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:dbt-tests:dbt:747')),
  ('web.component.canvas.DvtTransformColumnModel', 'dvt', 'current', jsonb_build_object('scopeReason', 'DVT-specific transform column semantics only.'), 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', md5('scope:dvt-columns:dvt:747'))
on conflict (component_id, plugin_id) do update set
  scope_status = excluded.scope_status,
  raw_scope = excluded.raw_scope,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_capability_gaps
where component_id = 'web.component.canvas.NodeWorkbench';

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodePresentationTruth',
    'GAP-CANVAS-NODE-PRESENTATION-LIVE-PROOF',
    'product-proof',
    'open',
    'Strict browser proof must show one connected model with consistent card/workbench columns and non-contradictory code authority.',
    'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    jsonb_build_object('requiredEvidence', 'strict Cypress live vertical', 'noFixtureSuccess', true),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('gap:CanvasNodePresentationTruth:live:747')
  ),
  (
    'web.component.canvas.CanvasNodeContextSurfaceCoordinator',
    'GAP-CANVAS-NODE-CONTEXT-SURFACE-LIVE-PROOF',
    'product-proof',
    'open',
    'Strict browser proof must show toolbar, health, and workbench exclusion plus node-removal cleanup.',
    'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    jsonb_build_object('requiredEvidence', 'strict Cypress live interaction', 'invariant', 'activeSurfaceCardinality <= 1'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('gap:CanvasNodeContextSurfaceCoordinator:live:747')
  ),
  (
    'web.component.canvas.NodePropertiesReadModel',
    'GAP-NODE-PROPERTIES-DEMANDING-METADATA-PROOF',
    'product-proof',
    'open',
    'Demanding-user proof must exercise complete source, model, column, test, sink, and metric evidence from canonical projections without fabricated fallback data.',
    'E-SOURCE-OBJECT-METRICS-PROD-1',
    jsonb_build_object('movedFrom', 'web.component.canvas.NodeWorkbench', 'noFabrication', true),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('gap:NodePropertiesReadModel:demanding-metadata:747')
  )
on conflict (component_id, gap_id) do update set
  gap_kind = excluded.gap_kind,
  gap_status = excluded.gap_status,
  description = excluded.description,
  owning_task_id = excluded.owning_task_id,
  raw_gap = excluded.raw_gap,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_validation_evidence
where component_id = 'web.component.canvas.NodeWorkbench';

update planning_query_store.frontend_component_local_evidence
set
  component_id = case
    when evidence_ref like '%dbtTestRowsReadModel%' then 'web.component.canvas.DbtTestRowsReadModel'
    when evidence_ref like '%dvtTransformColumnModel%' then 'web.component.canvas.DvtTransformColumnModel'
    else 'web.component.canvas.NodePropertiesReadModel'
  end,
  source_path = 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
  source_content_sha256 = md5(evidence_id || ':owner-reconciled:747'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeWorkbench';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodePresentationTruth',
    'EV-CANVAS-NODE-PRESENTATION-TRUTH-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts',
    'ProjectCanvasNodePresentationTruth',
    'selected-node-presentation',
    'Declared and inherited columns remain distinguishable and workspace-file code authority is not reported as absent.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/canvas/canvasNodePresentationTruth.test.ts'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('evidence:CanvasNodePresentationTruth:unit:747')
  ),
  (
    'web.component.canvas.CanvasNodePresentationTruth',
    'EV-CANVAS-NODE-PRESENTATION-TRUTH-VIEWPORT',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'ProjectCanvasNodePresentationTruth',
    'selected-node-presentation',
    'The viewport projects one truth object into node data consumed by card and workbench surfaces.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('evidence:CanvasNodePresentationTruth:viewport:747')
  ),
  (
    'web.component.canvas.CanvasNodeContextSurfaceCoordinator',
    'EV-CANVAS-NODE-CONTEXT-SURFACE-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts',
    'CoordinateCanvasNodeContextSurface',
    'selected-node-context',
    'The reducer preserves active-surface cardinality and clears removed or externally obscured nodes.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('evidence:CanvasNodeContextSurfaceCoordinator:unit:747')
  ),
  (
    'web.component.canvas.CanvasNodeContextSurfaceCoordinator',
    'EV-CANVAS-NODE-CONTEXT-SURFACE-VIEWPORT',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
    'CoordinateCanvasNodeContextSurface',
    'selected-node-context',
    'Viewport integration removes the toolbar when workbench state becomes externally active or the selected node disappears.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('evidence:CanvasNodeContextSurfaceCoordinator:viewport:747')
  ),
  (
    'web.component.canvas.NodePropertiesReadModel',
    'EV-NODE-PROPERTIES-PRESENTATION-TRUTH',
    'unit-test',
    'current',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'InspectCanvasNodeProperties',
    'node-properties-projection',
    'The workbench read model uses the shared column and code truth without claiming inherited columns are declared or file-backed code is absent.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/nodePropertiesReadModel.test.ts'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('evidence:NodePropertiesReadModel:presentation-truth:747')
  ),
  (
    'web.component.canvas.DbtTestRowsReadModel',
    'EV-DBT-TEST-ROWS-READ-MODEL-OWNER',
    'unit-test',
    'current',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
    'InspectCanvasNodeProperties',
    'dbt-test-row-projection',
    'DBT test rows preserve test target, column, expression, and fallback provenance.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/dbtTestRowsReadModel.test.ts'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('evidence:DbtTestRowsReadModel:owner:747')
  ),
  (
    'web.component.canvas.DvtTransformColumnModel',
    'EV-DVT-TRANSFORM-COLUMN-MODEL-OWNER',
    'unit-test',
    'current',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'InspectCanvasNodeProperties',
    'dvt-transform-column-projection',
    'DVT transform columns are derived only from connected recorded metadata and retain selection state.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/dvtTransformColumnModel.test.ts'),
    'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
    md5('evidence:DvtTransformColumnModel:owner:747')
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

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  ('REL-WEB-CANVAS-VIEWPORT-USES-NODE-PRESENTATION-TRUTH', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'depends_on', 'outbound', 'sync', null, 'Viewport maps contradictory card and workbench facts.', 'authorized canvas graph', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts'), 'implemented'),
  ('REL-WEB-GRAPH-NODE-CARD-USES-NODE-PRESENTATION-TRUTH', 'web.component.canvas.GraphNodeCardStrategy', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'depends_on', 'outbound', 'sync', null, 'Card column count diverges from the workbench.', 'authorized canvas graph', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'), 'implemented'),
  ('REL-WEB-NODE-PROPERTIES-USES-NODE-PRESENTATION-TRUTH', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'depends_on', 'outbound', 'sync', null, 'Workbench silently changes column provenance or code authority.', 'authorized canvas graph', jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'), 'implemented'),
  ('REL-WEB-CANVAS-VIEWPORT-USES-CONTEXT-SURFACE-COORDINATOR', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'depends_on', 'outbound', 'sync', null, 'Toolbar, health, and external workbench surfaces compete or become orphaned.', 'authorized canvas graph', jsonb_build_array('apps/web/src/app/views/canvas/CanvasViewport.tsx', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts'), 'implemented'),
  ('REL-WEB-NODE-PROPERTIES-USES-DBT-TEST-ROWS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'depends_on', 'outbound', 'sync', null, 'Generic node-property projection owns DBT-specific test parsing.', 'authorized canvas graph', jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'), 'implemented'),
  ('REL-WEB-NODE-PROPERTIES-USES-DVT-TRANSFORM-COLUMNS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'depends_on', 'outbound', 'sync', null, 'Generic node-property projection owns DVT-specific input-column semantics.', 'authorized canvas graph', jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts'), 'implemented'),
  ('REL-WEB-CANVAS-COPY-CATALOG-ADAPTS-NODE-PRESENTATION', 'SYS-WEB-CANVAS-COPY-LOCALIZATION', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'depends_on', 'outbound', 'sync', null, 'Localized copy leaks into the semantic projection.', 'localized canvas presentation', jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts', 'apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts'), 'implemented')
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  ('TEST-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/canvas/canvasNodePresentationTruth.test.ts'),
  ('TEST-WEB-CANVAS-NODE-PRESENTATION-VIEWPORT', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx', 'integration', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'),
  ('TEST-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATION', 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts', 'unit', 'boundary', true, 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts'),
  ('TEST-WEB-CANVAS-NODE-CONTEXT-SURFACE-VIEWPORT', 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx', 'integration', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
  ('TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/nodePropertiesReadModel.test.ts'),
  ('TEST-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/dbtTestRowsReadModel.test.ts'),
  ('TEST-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/dvtTransformColumnModel.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', repeat(md5('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH:747'), 2), 0, 'Canvas node presentation truth', 'component', 'SYS-WEB-VIEW-CANVAS', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Own the provenance-preserving semantic projection shared by card and workbench consumers.', 'CanvasNodePresentationTruth', 'ProjectCanvasNodePresentationTruth', 'codex'),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', repeat(md5('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR:747'), 2), 0, 'Canvas node context surface coordinator', 'component', 'SYS-WEB-VIEW-CANVAS', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Own the exclusive transient selected-node surface state machine.', 'CanvasNodeContextSurfaceState', 'CoordinateCanvasNodeContextSurface', 'codex'),
  ('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', repeat(md5('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL:747'), 2), 0, 'Canvas DBT test rows read model', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Own target-aware DBT test row projection.', 'DbtTestRowsReadModel', 'InspectCanvasNodeProperties', 'codex'),
  ('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql', repeat(md5('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL:747'), 2), 0, 'Canvas DVT transform column model', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Own DVT upstream transform-column option projection.', 'DvtTransformColumnModel', 'InspectCanvasNodeProperties', 'codex')
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.governance_component_local_definitions.revision + 1,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  created_by = excluded.created_by;

update planning_query_store.governance_component_local_definitions
set
  owned_concern = 'Compose passive node-property sections from canonical node truth and delegated DBT-test and DVT-column read models.',
  ddd_owner = 'NodePropertiesReadModel',
  cq_rails = 'InspectCanvasNodeProperties',
  source_path = 'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL:747'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
  'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
  'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
  'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'owns', 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts', 0),
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'owns', 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 1),
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'owns', 'apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts', 2),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'owns', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts', 0),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'owns', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts', 1),
  ('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'owns', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts', 0),
  ('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'owns', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts', 1),
  ('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'owns', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 0),
  ('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'owns', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
  'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
  'SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
  'SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'responsibility', 'Project one semantic truth for columns and code authority.', 0),
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'reason_to_change', 'Column provenance or node code-authority semantics change.', 0),
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'public_api', 'CanvasNodePresentationTruth;buildCanvasNodePresentationTruth', 0),
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'invariant', 'Card and workbench consumers receive the same visible column count and code authority.', 0),
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'consumer', 'CanvasViewport;GraphNodeCardStrategy;NodePropertiesReadModel', 0),
  ('SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'fowler_signal', 'replace divergent read models with one provenance-preserving projection', 0),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'responsibility', 'Reduce contextual node events to one transient active surface.', 0),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'reason_to_change', 'Selected-node surface exclusion or dismissal policy changes.', 0),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'public_api', 'createCanvasNodeContextSurfaceState;reduceCanvasNodeContextSurface', 0),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'invariant', 'cardinality(active contextual node surfaces) <= 1', 0),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'consumer', 'CanvasViewport', 0),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'fowler_signal', 'replace independent booleans with a closed state machine', 0),
  ('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'responsibility', 'Project target-aware DBT test rows.', 0),
  ('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'reason_to_change', 'DBT test semantics or row vocabulary changes.', 0),
  ('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'public_api', 'buildDbtTestRows', 0),
  ('SYS-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL', 'consumer', 'NodePropertiesReadModel', 0),
  ('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'responsibility', 'Project DVT transform-column options.', 0),
  ('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'reason_to_change', 'DVT upstream column selection semantics change.', 0),
  ('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'public_api', 'buildTransformColumnOptions', 0),
  ('SYS-WEB-CANVAS-DVT-TRANSFORM-COLUMN-MODEL', 'consumer', 'NodePropertiesReadModel', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.design
set
  rail_ref = 'ProjectCanvasNodePresentationTruth;RenderCanvasGraphNodeCard;InspectCanvasNodeProperties;GetWorkspaceFileContent;CoordinateCanvasNodeContextSurface;ResolveCanvasViewCopy',
  status = 'implementing',
  updated_at = now()
where design_id = 'CANVAS-NODE-PRESENTATION-TRUTH-20260717';

with rail_specs (
  rail_name, rail_type, ddd_owner, symbol_refs, implementation_refs,
  raw_rail
) as (
  values
    (
      'ProjectCanvasNodePresentationTruth',
      'query',
      'CanvasNodePresentationTruth',
      jsonb_build_array(
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts#CanvasNodePresentationColumnProvenance',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts#CanvasNodePresentationColumn',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts#CanvasNodeColumnTruth',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts#CanvasNodeCodeLanguage',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts#CanvasNodeCodeTruth',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts#CanvasNodePresentationTruth',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts#isCanvasNodePresentationTruth',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts#CanvasNodePresentationEdge',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts#buildCanvasNodePresentationTruth'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts',
        'apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'
      ),
      jsonb_build_object(
        'name', 'ProjectCanvasNodePresentationTruth',
        'type', 'query',
        'boundedContext', 'Canvas node presentation',
        'dddObject', 'CanvasNodePresentationTruth',
        'applicationPort', 'buildCanvasNodePresentationTruth',
        'adapterSurface', 'CanvasViewport;GraphNodeCardStrategy;NodePropertiesReadModel',
        'scopeAndAuthorization', 'one node from an already-authorized visible Canvas graph',
        'negativeTests', jsonb_build_array(
          'do not read workspace file bytes',
          'do not localize labels',
          'do not collapse inherited columns into declared columns'
        )
      )
    ),
    (
      'CoordinateCanvasNodeContextSurface',
      'command',
      'CanvasNodeContextSurfaceState',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts#CanvasNodeFloatingToolbarAnchor',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts#CanvasNodeHealthPopoverModel',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts#CanvasNodeContextActiveSurface',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts#CanvasNodeContextSurfaceState',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts#CanvasNodeContextSurfaceEvent',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts#createCanvasNodeContextSurfaceState',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts#reduceCanvasNodeContextSurface'
      ),
      jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts',
        'apps/web/src/app/views/canvas/CanvasViewport.tsx',
        'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
        'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx'
      ),
      jsonb_build_object(
        'name', 'CoordinateCanvasNodeContextSurface',
        'type', 'command',
        'boundedContext', 'Canvas selected-node interaction',
        'dddObject', 'CanvasNodeContextSurfaceState',
        'applicationPort', 'reduceCanvasNodeContextSurface',
        'adapterSurface', 'CanvasViewport',
        'scopeAndAuthorization', 'local UI state for an already-authorized visible Canvas graph',
        'negativeTests', jsonb_build_array(
          'do not expose toolbar and health concurrently',
          'do not retain a surface after its node is removed',
          'do not reopen transients while workbench or code is active'
        )
      )
    ),
    (
      'ResolveCanvasViewCopy',
      'query',
      'CanvasCopyCatalog',
      jsonb_build_array(
        'apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts#CanvasNodePresentationCopy',
        'apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts#isCanvasNodePresentationCopy',
        'apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts#buildCanvasNodePresentationCopy'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts',
        'apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts',
        'apps/web/src/app/views/canvas/canvasCopy.types.ts',
        'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.ts',
        'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.es.ts'
      ),
      jsonb_build_object(
        'name', 'ResolveCanvasViewCopy',
        'type', 'query',
        'boundedContext', 'Canvas presentation copy',
        'dddObject', 'CanvasViewCopy',
        'applicationPort', 'buildCanvasNodePresentationCopy',
        'adapterSurface', 'CanvasCopyCatalog',
        'scopeAndAuthorization', 'current browser locale; no additional data scope',
        'negativeTests', jsonb_build_array(
          'do not embed visible copy in semantic read models',
          'do not mix locales within one Canvas copy snapshot'
        )
      )
    )
), feature_manifest as (
  select jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Project one provenance-preserving node truth, coordinate transient selected-node surfaces through a closed state machine, and adapt localized copy through the existing Canvas copy catalog.',
    'componentGuides', jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
    ),
    'userStories', jsonb_build_array(
      'A demanding user sees the same column count and provenance on the card and in the workbench.',
      'File-backed model code is identified by its workspace path instead of being reported as absent.',
      'Toolbar, health, and workbench surfaces never compete or remain orphaned.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts',
      'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts',
      'apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts',
      'apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts',
      'apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts',
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts',
      'apps/web/src/app/views/canvas/CanvasViewport.tsx',
      'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
      'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
      'tools/planning-db/migrations/746_canvas_node_presentation_truth_design.sql',
      'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/fixtures/**',
      'buzon/**',
      'docs/planning/state/agent-lane-*.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasNodePresentationTruth',
      'CanvasNodeContextSurfaceState',
      'CanvasViewCopy'
    ),
    'fowlerSignals', jsonb_build_array(
      'divergent read models',
      'independent boolean state',
      'responsibility overload'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm test:planning:db:migrations',
      'pnpm planning:db:integrity:check'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web lint',
      'pnpm --filter @dvt/web typecheck',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'ProjectCanvasNodePresentationTruth', 'type', 'query', 'dddOwner', 'CanvasNodePresentationTruth', 'status', 'implemented'),
      jsonb_build_object('name', 'CoordinateCanvasNodeContextSurface', 'type', 'command', 'dddOwner', 'CanvasNodeContextSurfaceState', 'status', 'implemented'),
      jsonb_build_object('name', 'ResolveCanvasViewCopy', 'type', 'query', 'dddOwner', 'CanvasCopyCatalog', 'status', 'implemented')
    ),
    'symbols', (
      select jsonb_agg(
        jsonb_build_object(
          'name', split_part(ref, '#', 2),
          'path', split_part(ref, '#', 1),
          'dddOwner', rail_specs.ddd_owner,
          'cqRails', jsonb_build_array(rail_specs.rail_name),
          'fowlerSignals', jsonb_build_array('single_responsibility'),
          'architectureGuard', 'pnpm test:planning:db:migrations',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
          'unitTests', case rail_specs.rail_name
            when 'ProjectCanvasNodePresentationTruth' then jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')
            when 'CoordinateCanvasNodeContextSurface' then jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts', 'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx')
            else jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeMapper.test.ts')
          end
        )
      )
      from rail_specs
      cross join lateral jsonb_array_elements_text(rail_specs.symbol_refs) refs(ref)
    )
  ) as manifest
)
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
select
  'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#' || rail_specs.rail_type || '#' || lower(rail_specs.rail_name),
  'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
  'implemented',
  rail_specs.rail_name,
  lower(rail_specs.rail_name),
  rail_specs.rail_type,
  rail_specs.ddd_owner,
  'implemented',
  rail_specs.symbol_refs,
  rail_specs.implementation_refs,
  jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
  feature_manifest.manifest->'governingSources',
  feature_manifest.manifest->'allowedImplementationSurfaces',
  feature_manifest.manifest->'architectureGuards',
  feature_manifest.manifest->'completionGate',
  'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
  repeat(md5(rail_specs.rail_name || ':747'), 2),
  rail_specs.raw_rail,
  feature_manifest.manifest,
  0,
  'codex'
from rail_specs
cross join feature_manifest
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  created_by = excluded.created_by,
  updated_at = now();

do $$
declare
  duplicate_file_count integer;
  unexpected_file_count integer;
  unexpected_files text;
  rail_count integer;
begin
  if not exists (
    select 1
    from planning_query_store.frontend_component_summary_query
    where component_id = 'web.component.canvas.NodeWorkbench'
      and component_status = 'retire'
      and reuse_decision = 'retire'
  ) then
    raise exception 'The ambiguous NodeWorkbench read-model aggregate is not retired';
  end if;

  select
    count(*),
    string_agg(file_path || ' [' || file_role || ']', ', ' order by file_path, file_role)
  into unexpected_file_count, unexpected_files
  from planning_query_store.frontend_component_file_query
  where component_id = 'web.component.canvas.NodeWorkbench';

  if unexpected_file_count <> 0 then
    raise exception 'Retired NodeWorkbench still owns % effective files: %',
      unexpected_file_count,
      unexpected_files;
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_rail_query
    where component_id = 'web.component.canvas.NodeWorkbench'
  ) then
    raise exception 'Retired NodeWorkbench still participates in command/query rails';
  end if;

  if (
    select count(*)
    from planning_query_store.frontend_component_file_query
    where component_id = 'web.component.canvas.CanvasNodePresentationTruth'
  ) <> 3 then
    raise exception 'CanvasNodePresentationTruth must own exactly its contract, projector, and unit test';
  end if;

  if (
    select count(*)
    from planning_query_store.frontend_component_file_query
    where component_id = 'web.component.canvas.CanvasNodeContextSurfaceCoordinator'
  ) <> 2 then
    raise exception 'CanvasNodeContextSurfaceCoordinator must own exactly its state model and unit test';
  end if;

  if (
    select count(*)
    from planning_query_store.frontend_component_file_query
    where component_id = 'web.component.canvas.NodePropertiesReadModel'
  ) <> 2 or (
    select count(*)
    from planning_query_store.frontend_component_file_query
    where component_id = 'web.component.canvas.DbtTestRowsReadModel'
  ) <> 2 or (
    select count(*)
    from planning_query_store.frontend_component_file_query
    where component_id = 'web.component.canvas.DvtTransformColumnModel'
  ) <> 2 then
    raise exception 'Extracted inspector read models must each own exactly source plus focused unit test';
  end if;

  select count(*) into duplicate_file_count
  from (
    select file_path
    from planning_query_store.frontend_component_file_query
    where file_path in (
      'apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts',
      'apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts',
      'apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts',
      'apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts',
      'apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts',
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts'
    )
    group by file_path
    having count(distinct component_id) <> 1
  ) duplicates;

  if duplicate_file_count <> 0 then
    raise exception 'Selected-node presentation files have % ambiguous effective owners', duplicate_file_count;
  end if;

  select count(*) into rail_count
  from planning_query_store.command_query_rail_query
  where rail_type = 'query'
    and normalized_rail_name = 'projectcanvasnodepresentationtruth'
    and ddd_owner = 'CanvasNodePresentationTruth'
    and rail_status = 'implemented';

  if rail_count <> 1 then
    raise exception 'Expected one implemented ProjectCanvasNodePresentationTruth query, found %', rail_count;
  end if;

  select count(*) into rail_count
  from planning_query_store.command_query_rail_query
  where rail_type = 'command'
    and normalized_rail_name = 'coordinatecanvasnodecontextsurface'
    and ddd_owner = 'CanvasNodeContextSurfaceState'
    and rail_status = 'implemented';

  if rail_count <> 1 then
    raise exception 'Expected one implemented CoordinateCanvasNodeContextSurface command, found %', rail_count;
  end if;

  select count(*) into rail_count
  from planning_query_store.command_query_rail_query
  where rail_type = 'query'
    and normalized_rail_name = 'resolvecanvasviewcopy'
    and ddd_owner = 'CanvasCopyCatalog'
    and rail_status = 'implemented';

  if rail_count <> 1 then
    raise exception 'Expected one implemented ResolveCanvasViewCopy query, found %', rail_count;
  end if;

  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_type = 'query'
      and normalized_rail_name = 'inspectcanvasnodeproperties'
      and ddd_owner = 'NodePropertiesReadModel'
      and rail_status = 'implemented'
  ) then
    raise exception 'InspectCanvasNodeProperties has not been reconciled to NodePropertiesReadModel';
  end if;

  if exists (
    select 1
    from architecture.design
    where design_id = 'CANVAS-NODE-PRESENTATION-TRUTH-20260717'
      and rail_ref like '%ProjectGraphNodeCardReadModel%'
  ) then
    raise exception 'Design still references the non-canonical ProjectGraphNodeCardReadModel name';
  end if;
end
$$;
