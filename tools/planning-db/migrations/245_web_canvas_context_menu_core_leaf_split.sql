-- Split the Canvas context-menu core into implementation leaves so the core
-- remains a composite boundary rather than a direct file owner.

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
  'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas context-menu core leaf split',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'SYS-WEB-CANVAS-CONTEXT-MENU-CORE still owned concrete primitives, view, presenter, and architecture-test files directly. This split keeps the core as a composite and assigns each implemented file to a concrete leaf with tests, ports, and Fowler/DDD evidence.',
  'responsibility_overload',
  'RenderCanvasContextMenu;PresentCanvasContextMenuActions;ResolveCanvasContextMenu;CreateCanvasAuthoringNode;RemoveCanvasEdgeFromContext;RecordArchitectureComponent;CheckPlanningDbComponentIntegrity',
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
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-CORE', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'path', 'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-CORE-LEAF-SPLIT-20260619', 'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

with leaf(component_id, source_path, name, ddd_owner, cq_rails, owned_concern) as (
  values
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
      'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
      'Canvas context menu primitives',
      'CanvasContextMenuPresentationPrimitives',
      'RenderCanvasContextMenu;PresentCanvasContextMenuActions',
      'Owns reusable Canvas context-menu surface, section, and item primitives without owning menu model resolution or command callbacks.'
    ),
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      'Canvas context menu view',
      'CanvasContextMenuView',
      'RenderCanvasContextMenu;ResolveCanvasContextMenu',
      'Owns the Canvas context-menu presentation template that renders pane and edge read models into primitive menu sections.'
    ),
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'Canvas context menu presenter',
      'CanvasContextMenuPresenter',
      'ResolveCanvasContextMenu;CreateCanvasAuthoringNode;RemoveCanvasEdgeFromContext',
      'Owns the hook that adapts viewport, pane, and edge gestures into governed context-menu read models and command callbacks.'
    )
)
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
select
  leaf.component_id,
  leaf.source_path,
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = leaf.source_path
    ),
    repeat('0', 64)
  ),
  0,
  leaf.name,
  'component',
  'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  leaf.owned_concern,
  leaf.ddd_owner,
  leaf.cq_rails,
  'codex'
from leaf
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  parent_id = excluded.parent_id,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
  'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW',
  'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'owns', 'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'owns', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'owns', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'excludes', 'apps/web/src/app/views/canvas/CanvasContextMenuView*', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'excludes', 'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'excludes', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.*.test.tsx', 0)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
  'owns',
  'apps/web/src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx',
  1
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
  'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW',
  'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'responsibility', 'Render reusable Canvas context-menu surface, section, and item primitives.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'non_goal', 'Does not resolve menu models or invoke Canvas commands.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'reason_to_change', 'Context-menu primitive markup, accessibility role, design token, or surface styling changes.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'public_api', 'CanvasContextMenuSurface; CanvasContextMenuSection; CanvasContextMenuItem', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'invariant', 'Primitives render menu roles and prevent native context menu bubbling without owning callbacks.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'transition', 'View template supplies menu sections/items -> primitives render accessible menu chrome.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'consumer', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'governance_ref', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'fowler_signal', 'Extract Component', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'responsibility', 'Render Canvas pane and edge context-menu read models into add, canvas, and edge action sections.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'non_goal', 'Does not decide available actions, close timing, or graph mutation execution.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'reason_to_change', 'Canvas context-menu layout, action section rendering, or edge/pane visual grouping changes.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'public_api', 'CanvasContextMenuView(props): JSX.Element | null', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'invariant', 'Node-scoped actions are absent from pane and edge context-menu rendering.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'transition', 'Resolved CanvasContextMenuModel -> primitive menu sections -> callback dispatch.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'consumer', 'apps/web/src/app/views/canvas/CanvasViewport.tsx', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'governance_ref', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'fowler_signal', 'Presentation Model', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'responsibility', 'Adapt Canvas context gestures to governed menu models and command callbacks.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'non_goal', 'Does not render menu DOM, define node action vocabulary, or persist graph mutations directly.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'reason_to_change', 'Context-menu open/close timing, browser echo suppression, pane/edge action dispatch, or callback wiring changes.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'public_api', 'useCanvasContextMenuPresenter(args): CanvasContextMenuPresenter', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'invariant', 'Right-click browser echo does not close a newly opened pane context menu.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'transition', 'Viewport/pane/edge gesture -> ResolveCanvasContextMenu model -> create node, canvas, or edge callback.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'consumer', 'apps/web/src/app/views/canvas/CanvasViewport.tsx', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'governance_ref', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'fowler_signal', 'Command Gateway', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with leaf(component_id, name, kind, repo_path, public_contract, maturity_score) as (
  values
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
      'Canvas context menu primitives',
      'ui-view',
      'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
      'Reusable Canvas context-menu surface, section, and item primitives.',
      78::numeric
    ),
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW',
      'Canvas context menu view',
      'ui-view',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      'Canvas context-menu template for pane and edge action read models.',
      82::numeric
    ),
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER',
      'Canvas context menu presenter',
      'module',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'Presenter hook that adapts Canvas context gestures to governed menu models and callbacks.',
      84::numeric
    )
)
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
select
  leaf.component_id,
  leaf.name,
  leaf.kind,
  'ui',
  'Frontend / Canvas',
  leaf.repo_path,
  leaf.public_contract,
  'browser',
  'medium',
  'review',
  leaf.maturity_score,
  'SYS-WEB-CANVAS-CONTEXT-MENU-CORE'
from leaf
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
values
  ('RESP-SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'Own reusable Canvas context-menu primitive rendering.', 'Context-menu primitive markup, accessibility role, design token, or surface styling changes.', 'CanvasContextMenuPresentationPrimitives', 'implemented'),
  ('RESP-SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'Own Canvas context-menu template rendering for pane and edge models.', 'Canvas context-menu layout, action section rendering, or edge/pane visual grouping changes.', 'CanvasContextMenuView', 'implemented'),
  ('RESP-SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'Own Canvas context-menu gesture-to-model presenter behavior.', 'Context-menu open/close timing, browser echo suppression, pane/edge action dispatch, or callback wiring changes.', 'CanvasContextMenuPresenter', 'implemented')
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
values
  ('REL-WEB-CANVAS-CONTEXT-MENU-CORE-CONTAINS-PRIMITIVES', 'SYS-WEB-CANVAS-CONTEXT-MENU-CORE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'contains', 'outbound', 'sync', null, 'missing primitive leaf keeps rendering chrome in the composite core', 'canvas-ui-local', jsonb_build_array('tools/planning-db/migrations/245_web_canvas_context_menu_core_leaf_split.sql'), 'implemented'),
  ('REL-WEB-CANVAS-CONTEXT-MENU-CORE-CONTAINS-VIEW', 'SYS-WEB-CANVAS-CONTEXT-MENU-CORE', 'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'contains', 'outbound', 'sync', null, 'missing view leaf keeps template rendering in the composite core', 'canvas-ui-local', jsonb_build_array('tools/planning-db/migrations/245_web_canvas_context_menu_core_leaf_split.sql'), 'implemented'),
  ('REL-WEB-CANVAS-CONTEXT-MENU-CORE-CONTAINS-PRESENTER', 'SYS-WEB-CANVAS-CONTEXT-MENU-CORE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'contains', 'outbound', 'sync', null, 'missing presenter leaf keeps gesture adaptation in the composite core', 'canvas-ui-local', jsonb_build_array('tools/planning-db/migrations/245_web_canvas_context_menu_core_leaf_split.sql'), 'implemented')
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
where component_id in (
  'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
  'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW',
  'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER'
);

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
values
  ('PORT-SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES-RENDER', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'RenderCanvasContextMenu', 'ui-action', 'inbound', null, null, array['CanvasContextMenuView.architecture.test.tsx rejects ad hoc class ownership in the view']::text[], 'implemented'),
  ('PORT-SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-RENDER', 'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'RenderCanvasContextMenu', 'ui-action', 'inbound', null, null, array['CanvasContextMenuView.test.tsx keeps node-scoped actions out of pane and edge menus']::text[], 'implemented'),
  ('PORT-SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-RESOLVE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'ResolveCanvasContextMenu', 'query', 'inbound', null, null, array['useCanvasContextMenuPresenter lifecycle tests keep browser click echo from closing a newly opened menu']::text[], 'implemented'),
  ('PORT-SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-CREATE-NODE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'CreateCanvasAuthoringNode', 'command', 'outbound', null, null, array['useCanvasContextMenuPresenter canvas action tests require model flow position before create-node dispatch']::text[], 'implemented'),
  ('PORT-SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-REMOVE-EDGE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'RemoveCanvasEdgeFromContext', 'command', 'outbound', null, null, array['useCanvasContextMenuPresenter graph action tests route edge removal only for edge context targets']::text[], 'implemented')
on conflict (port_id) do update set
  component_id = excluded.component_id,
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
  ('TEST-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES-ARCHITECTURE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'apps/web/src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx'),
  ('TEST-WEB-CANVAS-CONTEXT-MENU-VIEW-BEHAVIOR', 'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasContextMenuView.test.tsx'),
  ('TEST-WEB-CANVAS-CONTEXT-MENU-VIEW-ARCHITECTURE', 'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'apps/web/src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx'),
  ('TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-LIFECYCLE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'),
  ('TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-GRAPH-ACTIONS', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx'),
  ('TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-CANVAS-ACTIONS', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx')
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
values
  ('OBS-SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES-UI-EVIDENCE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES', 'Primitive rendering is observable through Canvas context-menu view architecture tests; no separate runtime telemetry is required.', 'log', true, 'not_applicable'),
  ('OBS-SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-UI-EVIDENCE', 'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW', 'Context-menu rendering is observable through view behavior and architecture tests; no separate runtime telemetry is required.', 'log', true, 'not_applicable'),
  ('OBS-SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-UI-EVIDENCE', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER', 'Context-menu presenter behavior is observable through lifecycle, graph action, and canvas action tests; no separate runtime telemetry is required.', 'log', true, 'not_applicable')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
