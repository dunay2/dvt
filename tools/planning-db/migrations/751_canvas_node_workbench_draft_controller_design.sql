-- Hard-Fowler follow-up: extract workbench draft reconciliation from the
-- CanvasNodeWorkbenchPanel presentation composition. This controller owns
-- transient UI state only and therefore must not create a parallel CQ rail.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719',
  'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
  'Canvas node workbench draft reconciliation controller',
  'Frontend / Canvas authoring',
  'implementing',
  E'Current state: CanvasNodeWorkbenchPanel composes tabs and read models while also tracking authoritative node revisions, dirty form state, tag text, cancellation, and node switches. That gives the presentation component a second reason to change and makes an explicitly empty SQL draft vulnerable to authoritative refreshes.\n\nTarget state: useCanvasNodeWorkbenchDraftController owns the deterministic UI-state transition between authoritative CanonicalNode snapshots and one editable CanvasInspectorNodeDraft. CanvasNodeWorkbenchPanel consumes its controller port. Persistence remains exclusively behind ConfigureCanvasDbtNode/ConfigureCanvasDvtNode; no new CQ rail is introduced for local presentation state.',
  'responsibility_overload',
  'ConfigureCanvasDbtNode;ConfigureCanvasDvtNode;InspectCanvasNodeProperties',
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
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER', 'may_create', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'component', 'web.component.canvas.CanvasNodeWorkbenchPanel', 'may_update', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'command', 'ConfigureCanvasDbtNode', 'may_reference', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'command', 'ConfigureCanvasDvtNode', 'may_reference', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
  'Canvas node workbench draft controller',
  'module',
  'ui',
  'Frontend / Canvas authoring',
  'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts',
  'CanvasNodeWorkbenchDraftController;useCanvasNodeWorkbenchDraftController',
  'browser',
  'high',
  'review',
  'SYS-WEB-CANVAS-NODE-WORKBENCH'
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
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values (
  'RESP-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
  'Reconcile one selected node authoritative snapshot with one transient editable draft, preserving dirty input across same-node refreshes and resetting on node switch or explicit cancel.',
  'The workbench draft lifecycle or authoritative reconciliation policy changes.',
  'CanvasNodeWorkbenchDraftController',
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
    'PORT-WEB-CANVAS-NODE-WORKBENCH-DRAFT-AUTHORITY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'reconcileAuthoritativeNode',
    'ui-action',
    'inbound',
    array[
      'same-node authoritative refresh overwrites dirty user input',
      'node switch retains the prior node draft',
      'explicit cancel resets to stale authority'
    ],
    'approved'
  ),
  (
    'PORT-WEB-CANVAS-NODE-WORKBENCH-DRAFT-VIEW',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'CanvasNodeWorkbenchDraftController',
    'query',
    'outbound',
    array[
      'presentation child owns a second draft state',
      'empty SQL is collapsed into missing SQL',
      'controller persists graph state directly'
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

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values (
    'REL-WEB-NODE-WORKBENCH-TO-DRAFT-CONTROLLER',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'contains',
    'outbound',
    'sync',
    'Workbench authoring is unavailable rather than creating an independent draft.',
    'Already-authorized selected Canvas node.',
    jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'),
    'approved'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasNodeWorkbenchDraftController',
  'CanvasNodeWorkbenchDraftController',
  'state-view',
  'planned',
  'extract',
  'Frontend / Canvas authoring',
  'Own selected-node draft reconciliation only; expose UI state without rendering, graph persistence, artifact projection, or CQ effects.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  jsonb_build_array('implementation and transition evidence pending'),
  '[]'::jsonb,
  jsonb_build_object(
    'dbFirst', true,
    'architectureComponentId', 'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'dddObject', 'CanvasNodeWorkbenchDraftController',
    'cqRails', jsonb_build_array(),
    'cqExemptionReason', 'Transient local UI-state controller with no application effect.',
    'plannedFiles', jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts',
      'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'
    ),
    'invariants', jsonb_build_array(
      'one selected node has one draft authority',
      'dirty drafts survive same-node authoritative refreshes',
      'node switches and explicit cancel reset deterministically',
      'the controller never persists graph or workspace state'
    )
  ),
  'tools/planning-db/migrations/751_canvas_node_workbench_draft_controller_design.sql',
  md5('component:CanvasNodeWorkbenchDraftController:planned:751')
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

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values (
  'web.component.canvas.CanvasNodeWorkbenchDraftController',
  'GAP-NODE-WORKBENCH-DRAFT-SRP',
  'responsibility-overload',
  'open',
  'CanvasNodeWorkbenchPanel still owns draft reconciliation in addition to presentation composition.',
  'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
  jsonb_build_object('requiredProof', 'controller transition unit tests plus strict live DBT SQL roundtrip'),
  'tools/planning-db/migrations/751_canvas_node_workbench_draft_controller_design.sql',
  md5('gap:CanvasNodeWorkbenchDraftController:srp:751')
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
