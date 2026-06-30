-- Canonicalize Web Canvas test ownership discovered by component-quality after
-- the viewport graph-model source repoint. Existing implemented tests are
-- mapped to real leaf components; planned split test paths are deprecated as
-- excludes instead of recreated as empty files.

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
  'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
  'planning_query_store.governance_component_local_definitions',
  'ef1c713dc11f29a3cf76dc04fb5040af5cb8ec4bc3f4ae9e85ef0e760bb6aeae',
  0,
  'Canvas graph viewport model tests',
  'component',
  'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns the canonical component test that validates Canvas graph viewport model projection behavior.',
  'CanvasGraphViewportPresentationTestContract',
  'ValidateCanvasViewportGraphModelComponentTests',
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'owns',
    'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx',
    2
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.governance_component_local_ownership_patterns
set pattern_kind = 'excludes'
where component_id = 'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION'
  and pattern_kind = 'owns'
  and pattern in (
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'responsibility',
    'Validate canonical nodes, edges, metadata, tags, and live position projection for useCanvasViewportGraphModel.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'reason_to_change',
    'Canvas graph viewport model behavior or test contract changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'public_api',
    'useCanvasViewportGraphModel.test.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'invariant',
    'The canonical viewport graph-model test owns behavior coverage when planned split support files are deprecated.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'transition',
    'review -> implemented after component-quality shows no files owned by SYS-WEB-CANVAS-GRAPH-VIEWPORT.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'consumer',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'fowler_signal',
    'test_harness_overload',
    0
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'invariant',
    'Legacy guide retirement remains covered by CanvasShell.legacyGuides.test.tsx through the CanvasShell harness.',
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
  parent_component_id,
  created_at,
  updated_at
)
values (
  'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
  'Canvas graph viewport model tests',
  'ui-view',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
  'Canvas viewport graph-model behavior test contract',
  'browser',
  'medium',
  'review',
  'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
  now(),
  now()
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

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status,
  created_at,
  updated_at
)
values (
  'REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-MODEL-TESTS',
  'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
  'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
  'contains',
  'outbound',
  'sync',
  'not_applicable',
  'web_canvas_component_ownership',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
  ),
  'implemented',
  now(),
  now()
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
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-SHELL-LEGACY-GUIDES',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx',
    'integration',
    'negative',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/CanvasShell.legacyGuides.test.tsx',
    now()
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
