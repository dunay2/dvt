-- Retire the fixed Canvas add-node palette after Canvas-first UX moved node
-- creation to the viewport context menu. Keep historical paths queryable as
-- deprecated evidence; do not recreate the removed component or its tests.

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
  'WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618',
  'UXDB-CANVAS-CONTEXT-MENU-P0-1',
  'Canvas fixed add-node palette retirement',
  'Frontend / Architecture / Planning DB',
  'review',
  'The Canvas-first specification makes the graph the base mode and routes node insertion through the Canvas context menu. CanvasAddNodePalette, its template catalogs, and first-node copy/tests duplicated the ResolveCanvasContextMenu/CreateCanvasAuthoringNode rails and kept fixed insertion chrome alive.',
  'responsibility_overload',
  'ResolveCanvasContextMenu;CreateCanvasAuthoringNode;ReadComponentProfile;DetectGovernedSourceDrift',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

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
  'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'tools/planning-db/migrations/147_web_canvas_legacy_add_node_palette_retirement.sql',
  '1471471471471471471471471471471471471471471471471471471471471471',
  0,
  'Canvas legacy add-node palette retirement evidence',
  'component',
  'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
  'SYS-DVT',
  'SYS-DVT',
  'legacy',
  false,
  'Owns deprecated evidence for removed fixed add-node palette files so the Canvas context-menu and viewport components remain the active creation authority.',
  'CanvasLegacyAddNodePaletteRetirement',
  'ResolveCanvasContextMenu;CreateCanvasAuthoringNode;ReadComponentProfile;DetectGovernedSourceDrift',
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
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'owns',
    'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'owns',
    'apps/web/src/app/views/canvas/CanvasAddNodePalette.test.tsx',
    1
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'owns',
    'apps/web/src/app/views/canvas/canvasTransformationTemplateCatalog.ts',
    2
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'owns',
    'apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog.ts',
    3
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
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'responsibility',
    'Represent the removed fixed add-node palette and template catalogs as deprecated evidence.',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'reason_to_change',
    'Historical fixed palette references, Canvas-first UX cleanup, or source inventory drift involving the retired palette paths.',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'invariant',
    'deprecated: fixed add-node palette files must not be recreated; node creation is owned by CanvasViewport and useCanvasContextMenuPresenter.',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'transition',
    'fixed-palette -> viewport-context-menu after Canvas-first UX retirement.',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'consumer',
    'Planning DB component-quality and Canvas UX architecture guards.',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'fowler_signal',
    'duplicate_semantics',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'public_api',
    'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
    0
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
  parent_component_id
)
values (
  'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'Web Canvas fixed add-node palette',
  'ui-view',
  'ui',
  'Frontend / Canvas',
  'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'Deprecated fixed add-node palette. Active node creation is owned by CanvasViewport, CanvasContextMenuView, and useCanvasContextMenuPresenter through ResolveCanvasContextMenu/CreateCanvasAuthoringNode.',
  'browser',
  'low',
  'deprecated',
  'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU'
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

update architecture.component
set
  status = 'deprecated',
  public_contract = 'Deprecated fixed add-node palette. Active node creation is owned by CanvasViewport, CanvasContextMenuView, and useCanvasContextMenuPresenter through ResolveCanvasContextMenu/CreateCanvasAuthoringNode.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-ADD-NODE-PALETTE';

update architecture.component_relation
set
  status = 'deprecated',
  source_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx'
  ),
  failure_mode = 'Retired fixed palette must not be recreated; creation remains contextual through the viewport.',
  updated_at = now()
where target_component_id = 'SYS-WEB-CANVAS-ADD-NODE-PALETTE';

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
  'architecture',
  'boundary',
  true,
  'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasShell.architecture.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618',
    'component',
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618',
    'component',
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618',
    'component',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    'may_reference',
    true
  ),
  (
    'WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618',
    'component',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'may_reference',
    true
  ),
  (
    'WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618',
    'test',
    'TEST-SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;
