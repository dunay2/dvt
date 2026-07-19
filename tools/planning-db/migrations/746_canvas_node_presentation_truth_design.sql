-- Govern the selected-node presentation slice before implementation. The
-- design removes contradictory card/workbench facts and makes toolbar,
-- operational health, and workbench surfaces mutually exclusive.

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
  'CANVAS-NODE-PRESENTATION-TRUTH-20260717',
  'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
  'Canonical selected-node presentation truth and contextual surface coordination',
  'Frontend / Canvas',
  'implementing',
  E'Current state: GraphNodeCard derives declared columns from node metadata; NodeWorkbench silently substitutes inherited transform inputs; CanvasViewport owns independent toolbar and health states while workbench visibility lives in shell state. This produces contradictory counts and competing surfaces.\n\nTarget state: CanonicalNode + graph context -> CanvasNodePresentationTruth -> GraphNodeCardStrategy and NodePropertiesReadModel -> passive views. CanvasNodeContextSurfaceCoordinator accepts node selection, health, workbench, code, removal, and dismissal events and exposes at most one transient contextual surface. File-backed code is represented as workspace-file authority, never as missing inline SQL. Copy is supplied by the locale catalog rather than embedded in read models.',
  'responsibility_overload',
  'ProjectCanvasNodePresentationTruth;ProjectGraphNodeCardReadModel;InspectCanvasNodeProperties;GetWorkspaceFileContent;RenderCanvasNodeFloatingToolbar',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'web.component.canvas.NodePropertiesReadModel', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'web.component.canvas.DbtTestRowsReadModel', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'web.component.canvas.DvtTransformColumnModel', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'web.component.canvas.NodeWorkbench', 'may_update', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'web.component.canvas.CanvasNodeWorkbenchPanel', 'may_update', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'web.component.canvas.GraphNodeCardStrategy', 'may_update', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'web.component.canvas.NodeFloatingToolbar', 'may_update', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'query', 'ProjectCanvasNodePresentationTruth', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'query', 'ProjectGraphNodeCardReadModel', 'may_reference', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'query', 'InspectCanvasNodeProperties', 'may_reference', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'query', 'GetWorkspaceFileContent', 'may_reference', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'test', 'TEST-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'must_prove', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'test', 'TEST-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATION', 'must_prove', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'test', 'TEST-WEB-CANVAS-NODE-PRESENTATION-LIVE', 'must_prove', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'path', 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md', 'may_reference', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values
  (
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'Canvas node presentation truth',
    'module',
    'application',
    'Frontend / Canvas read models',
    'apps/web/src/app/views/canvas/canvasNodePresentationTruth.ts',
    'CanvasNodePresentationTruth',
    'browser',
    'high',
    'review',
    'SYS-WEB-VIEW-CANVAS'
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'Canvas node context surface coordinator',
    'module',
    'application',
    'Frontend / Canvas interaction',
    'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
    'CanvasNodeContextSurfaceState',
    'browser',
    'high',
    'review',
    'SYS-WEB-VIEW-CANVAS'
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

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  (
    'RESP-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'Project declared and inherited columns plus inline or workspace-file code authority into one provenance-preserving selected-node read model.',
    'The semantic distinction between declared, inherited, and unavailable node facts changes.',
    'CanvasNodePresentationTruth',
    'approved'
  ),
  (
    'RESP-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'Reduce contextual node interaction events to one coherent toolbar, health, workbench, code, or idle posture.',
    'The mutual-exclusion or dismissal policy of selected-node contextual surfaces changes.',
    'CanvasNodeContextSurfaceState',
    'approved'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  negative_tests,
  status
)
values
  (
    'PORT-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'ProjectCanvasNodePresentationTruth',
    'query',
    'inbound',
    array[
      'declared and inherited columns are reported as the same provenance',
      'file-backed code is reported as unavailable because inline SQL is absent',
      'card and workbench receive different visible column counts'
    ],
    'approved'
  ),
  (
    'PORT-WEB-CANVAS-NODE-CONTEXT-SURFACE',
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'ReduceCanvasNodeContextSurface',
    'ui-action',
    'inbound',
    array[
      'toolbar remains visible after workbench opens',
      'health remains visible after node removal',
      'an embedded card control opens the selection toolbar'
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
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  raw_component,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodePresentationTruth',
    'CanvasNodePresentationTruth',
    'query-view',
    'planned',
    'create',
    'Frontend / Canvas read models',
    'Expose one provenance-preserving node truth for card and workbench consumers without rendering or loading file bytes.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    jsonb_build_array('implementation and demanding-user evidence pending'),
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
      'dddObject', 'CanvasNodePresentationTruth',
      'fileCountZeroIsValid', true,
      'plannedFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodePresentationTruth.ts',
        'apps/web/src/app/views/canvas/canvasNodePresentationTruth.test.ts'
      ),
      'invariants', jsonb_build_array(
        'declared and inherited column sets remain distinct',
        'visibleColumnCount is derived once and shared by all consumers',
        'workspace-file code authority is not inferred as missing inline code',
        'the read model contains no localized display copy'
      )
    ),
    'tools/planning-db/migrations/746_canvas_node_presentation_truth_design.sql',
    repeat(md5('web.component.canvas.CanvasNodePresentationTruth:746'), 2)
  ),
  (
    'web.component.canvas.CanvasNodeContextSurfaceCoordinator',
    'CanvasNodeContextSurfaceCoordinator',
    'state-view',
    'planned',
    'create',
    'Frontend / Canvas interaction',
    'Own the closed contextual-surface state machine without rendering toolbar, health, or workbench markup.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    jsonb_build_array('implementation and pointer/keyboard evidence pending'),
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
      'dddObject', 'CanvasNodeContextSurfaceState',
      'fileCountZeroIsValid', true,
      'plannedFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
        'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts'
      ),
      'stateSet', jsonb_build_array('idle', 'toolbar', 'health'),
      'externalExclusiveSurfaces', jsonb_build_array('node-workbench', 'node-code', 'project-code'),
      'invariant', 'cardinality(active contextual node surfaces) <= 1'
    ),
    'tools/planning-db/migrations/746_canvas_node_presentation_truth_design.sql',
    repeat(md5('web.component.canvas.CanvasNodeContextSurfaceCoordinator:746'), 2)
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
    'web.component.canvas.CanvasNodePresentationTruth',
    'ProjectCanvasNodePresentationTruth',
    'local-query',
    'gap-needed',
    jsonb_build_object(
      'kind', 'query',
      'boundedContext', 'Canvas node presentation',
      'dddObject', 'CanvasNodePresentationTruth',
      'applicationPort', 'buildCanvasNodePresentationTruth',
      'adapterSurface', 'GraphNodeCardStrategy;NodePropertiesReadModel',
      'scope', 'one visible canonical node and its visible graph context',
      'authorization', 'inherits the already-authorized canvas graph projection',
      'negativeTests', jsonb_build_array(
        'do not read workspace file bytes',
        'do not localize labels',
        'do not collapse inherited columns into declared columns'
      )
    ),
    'tools/planning-db/migrations/746_canvas_node_presentation_truth_design.sql',
    repeat(md5('ProjectCanvasNodePresentationTruth:746'), 2)
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
