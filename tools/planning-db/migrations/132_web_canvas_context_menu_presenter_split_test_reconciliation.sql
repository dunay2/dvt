-- Reconcile useCanvasContextMenuPresenter test ownership after the monolithic
-- presenter test was split. The presenter-test component remains canonical;
-- removed paths are kept as deprecated ownership evidence.

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
  'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas context menu presenter split test reconciliation',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'Parallel Web work replaced the monolithic useCanvasContextMenuPresenter.test.tsx evidence with lifecycle, graph-action, and canvas-action presenter tests. This design keeps SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS as the canonical test component and records the removed monolithic path as deprecated ownership evidence.',
  'hidden_authority',
  'RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;DetectGovernedSourceDrift;CheckPlanningDbComponentIntegrity',
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
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'component',
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS-LEAF',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-LIFECYCLE',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-GRAPH-ACTIONS',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PRESENTER-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-CANVAS-ACTIONS',
    'may_create',
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
  created_by,
  created_at
)
values (
  'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
  'planning_query_store.governance_component_local_definitions',
  'fc84b7d72244d4a8cf2f86ff8f1495086dd7a2f6b25fd9eaaab9cc69831a12f6',
  1,
  'Canvas context menu presenter tests',
  'component',
  'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns split lifecycle, graph-action, and canvas-action tests for useCanvasContextMenuPresenter behavior.',
  'CanvasContextMenuPresenterTests',
  'ResolveCanvasContextMenu',
  'codex',
  now()
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = excluded.revision,
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

update planning_query_store.governance_component_local_ownership_patterns pattern
set pattern_kind = 'excludes'
where pattern.component_id = 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS'
  and pattern.pattern_kind = 'owns'
  and pattern.pattern = 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx'
  and not exists (
    select 1
    from planning_query_store.governance_component_local_ownership_patterns existing_exclude
    where existing_exclude.component_id = pattern.component_id
      and existing_exclude.pattern_kind = 'excludes'
      and existing_exclude.pattern = pattern.pattern
  );

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    1
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
    2
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'excludes',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx',
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
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'responsibility',
    'Validate context menu presenter lifecycle, graph-action dispatch, and canvas-action dispatch behavior through split focused tests.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'reason_to_change',
    'Context menu presenter lifecycle, action routing, pane-click policy, or contextual menu read model behavior changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'public_api',
    'useCanvasContextMenuPresenter',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'invariant',
    'useCanvasContextMenuPresenter.test.tsx is a deprecated removed test path; split presenter tests are the active evidence.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'transition',
    'review -> implemented after component-quality and source-drift show no stale context-menu presenter test paths.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'consumer',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'fowler_signal',
    'documentation_drift',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
  public_contract = 'useCanvasContextMenuPresenter split test evidence: lifecycle, graph actions, and canvas actions',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS';

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command,
  created_at
)
values
  (
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS-LEAF',
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-LIFECYCLE',
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-GRAPH-ACTIONS',
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-CANVAS-ACTIONS',
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
    now()
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
