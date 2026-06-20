-- Reconcile the Canvas node context-menu leaf with the active Canvas context
-- menu core. The previous local component pointed at a missing parent and left
-- the implemented node context-menu model files owned by a broad canvas bucket.

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
  'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-LEAF-AUTHORITY-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas node context-menu leaf authority',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW was a real implemented concern, but its parent component did not exist in the unit tree and its model/test files were still owned by the broad Canvas component bucket. Reparent the leaf under the active Canvas context-menu core, keep ResolveCanvasContextMenu as the canonical query rail, and record file, test, port, and maturity evidence.',
  'boundary_drift',
  'ResolveCanvasContextMenu;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
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
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-LEAF-AUTHORITY-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-LEAF-AUTHORITY-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-LEAF-AUTHORITY-20260619',
    'path',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-LEAF-AUTHORITY-20260619',
    'path',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-LEAF-AUTHORITY-20260619',
    'test',
    'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-LEAF-AUTHORITY-20260619',
    'query',
    'ResolveCanvasContextMenu',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded by SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW, which now owns the node context-menu model under the active Canvas context-menu core.',
  source_path = 'tools/planning-db/migrations/244_web_canvas_node_context_menu_leaf_authority.sql',
  source_content_sha256 = repeat('0', 64),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL'
  and status <> 'superseded';

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
  'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts'
    ),
    repeat('0', 64)
  ),
  2,
  'Canvas node context menu model',
  'component',
  'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns the node-target Canvas context-menu action read model and tests without owning DBT node card rendering or graph mutation commands.',
  'CanvasContextMenuReadModel',
  'ResolveCanvasContextMenu',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = greatest(
    planning_query_store.governance_component_local_definitions.revision,
    excluded.revision
  ),
  name = excluded.name,
  parent_id = excluded.parent_id,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'owns',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'owns',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    1
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'excludes',
    'apps/web/src/app/components/canvas/DbtNodeComponent*',
    0
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'responsibility',
    'Derive node-target Canvas context-menu action groups from graph posture and execution selection state.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'responsibility',
    'Keep node context-menu actions behind the ResolveCanvasContextMenu query rail without duplicating DBT node card rendering.',
    1
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'non_goal',
    'Does not own DBT node rendering, React Flow handles, node mutation execution, or inspector tab rendering.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'reason_to_change',
    'Node context-menu action vocabulary, read-only posture, execution-selection posture, or modeler action grouping changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'public_api',
    'buildCanvasNodeContextMenuModel(args): CanvasNodeContextMenuModel',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'public_api',
    'buildCanvasNodeModelerActionModel(args): CanvasNodeModelerActionModel',
    1
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'invariant',
    'Read-only graph posture exposes inspect-only node actions and never emits mutation actions.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'invariant',
    'Node-target context menus never expose pane/source/project actions owned by the Canvas background context menu.',
    1
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'transition',
    'Node gesture target -> ResolveCanvasContextMenu read model -> DbtNodeComponent action dispatcher.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'consumer',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'governance_ref',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    1
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    2
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'fowler_signal',
    'Presentation Model',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'fowler_signal',
    'Duplicate semantics guard',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  maturity_score,
  parent_component_id
)
values (
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
  'Canvas node context menu model',
  'module',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
  'Node-target Canvas context-menu read model and action grouping boundary for ResolveCanvasContextMenu.',
  'browser',
  'medium',
  'review',
  84,
  'SYS-WEB-CANVAS-CONTEXT-MENU-CORE'
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
  maturity_score = excluded.maturity_score,
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
values (
  'RESP-SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
  'Own node-target Canvas context-menu read-model actions and posture filtering.',
  'Node context-menu action vocabulary, read-only posture, execution-selection posture, or modeler grouping changes.',
  'CanvasContextMenuReadModel',
  'implemented'
)
on conflict (responsibility_id) do update set
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-WEB-CANVAS-CONTEXT-MENU-CORE-CONTAINS-NODE-CONTEXT-MENU-MODEL',
  'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
  'contains',
  'outbound',
  'sync',
  null,
  'missing node context-menu model leaves node-specific actions in a broad Canvas bucket',
  'canvas-ui-local',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md',
    'tools/planning-db/migrations/244_web_canvas_node_context_menu_leaf_authority.sql'
  ),
  'implemented'
)
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

delete from architecture.component_port
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW';

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
values (
  'PORT-SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW-RESOLVE',
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
  'ResolveCanvasContextMenu',
  'query',
  'inbound',
  null,
  null,
  array[
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts denies pane/project actions for node targets',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts fails closed for read-only mutation posture'
  ]::text[],
  'implemented'
)
on conflict (port_id) do update set
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL',
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/components/canvas/canvasNodeContextMenuModel.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-NODE-CONTEXT-MENU-DBT-NODE-GUARD',
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW-UI-EVIDENCE',
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
  'Node context-menu action posture is observable through Canvas UI behavior and unit/architecture tests; no separate runtime telemetry is required.',
  'log',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
