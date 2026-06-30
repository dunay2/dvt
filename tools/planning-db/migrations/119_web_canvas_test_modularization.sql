-- Reconcile Canvas test evidence after splitting oversized viewport graph-model
-- coverage and retiring duplicate legacy guide DOM assertions.

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION'
  and pattern = 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-SHELL-TEST-HARNESS'
  and pattern in (
    'apps/web/src/app/views/canvas/CanvasShell.contextualSurfaces.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx'
  );

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    3
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    4
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    5
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
    6
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
    7
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'owns',
    'apps/web/src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx',
    1
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-SHELL-TEST-HARNESS'
  and item_value in (
    'Validate CanvasShell contextual surfaces and legacy guide retirement through one harness.',
    'CanvasShell contextual surface and legacy guide tests.'
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'responsibility',
    'Validate CanvasShell contextual dialogs through one harness without re-testing retired legacy guide DOM.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'consumer',
    'CanvasShell contextual dialog tests.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'invariant',
    'Viewport graph-model behavior is covered by small edge, node-data, and layout tests rather than one oversized file.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasViewport.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-NODE-DATA',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-LAYOUT',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-SHELL-TEST-HARNESS',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'apps/web/src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx',
    'integration',
    'flow',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
