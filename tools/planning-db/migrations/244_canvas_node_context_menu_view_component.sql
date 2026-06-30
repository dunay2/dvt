-- Declare the Canvas node context-menu presentation view as a DB-owned leaf.
-- The product rail stays ResolveCanvasContextMenu; this slice only separates
-- the node menu template from the React Flow node shell.

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
  'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'Separate Canvas node context-menu presentation',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'CanvasNodeShell owns the React Flow shell and gestures; CanvasNodeContextMenuView owns the rendered node menu template so node workbench sections are not duplicated as context-menu actions.',
  'responsibility_overload',
  'ResolveCanvasContextMenu',
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
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619',
    'query',
    'ResolveCanvasContextMenu',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
  'e27b88e24f8647e5bed601930099830ee2bc541ad916f123e5c58e9dfd9db5e0',
  0,
  'Canvas node context menu view',
  'component',
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns the React presentation template for node context-menu groups and actions without owning the menu read model, node mutation commands, or node workbench sections.',
  'CanvasNodeContextMenuView',
  'ResolveCanvasContextMenu',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
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
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

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
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'owns',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx',
    1
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
    'Render node context-menu groups and actions from CanvasNodeContextMenuModel.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'reason_to_change',
    'Node context-menu presentation, grouping, action label rendering, or view boundary tests change.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'public_api',
    'CanvasNodeContextMenuView',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'invariant',
    'Node workbench sections such as Properties, Inputs / Outputs, Tests, SQL, Preview, Runs, and Lineage stay inside the workbench and are not rendered as node context-menu actions.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'consumer',
    'CanvasNodeShell',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'fowler_signal',
    'presentation_logic_separation',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
