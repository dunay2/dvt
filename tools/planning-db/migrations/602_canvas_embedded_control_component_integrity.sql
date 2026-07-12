-- Reconcile the embedded-control slice with the pre-existing canonical Canvas
-- viewport architecture component. The frontend component profile remains
-- available; architecture ownership has exactly one component per repo path.

update architecture.component_relation
set
  source_component_id = 'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
  source_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts'
  ),
  updated_at = now()
where relation_id = 'REL-CANVAS-VIEWPORT-USES-NODE-INTERACTION-BOUNDARY'
  and source_component_id = 'web.component.canvas.CanvasViewport';

delete from architecture.component_relation
where relation_id = 'REL-GRAPH-SURFACE-CONTAINS-CANVAS-VIEWPORT'
  and target_component_id = 'web.component.canvas.CanvasViewport';

delete from architecture.component
where component_id = 'web.component.canvas.CanvasViewport'
  and repo_path = 'apps/web/src/app/views/canvas/CanvasViewport.tsx';

update architecture.component
set parent_component_id = 'SYS-WEB-CANVAS-GRAPH-SURFACE', updated_at = now()
where component_id in (
  'web.component.canvas.CanvasNodePortHandle',
  'web.component.canvas.CanvasNodeInteractionBoundary'
);

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
    'RESP-CANVAS-NODE-PORT-HANDLE',
    'web.component.canvas.CanvasNodePortHandle',
    'Render one graph-node port handle with stable identity, direction, compatibility hint, and an embedded-control interaction marker without deciding graph compatibility.',
    'The graph-node port presentation, accessibility contract, or embedded-control marker changes.',
    'CanvasGraphPortPresentation',
    'implemented'
  ),
  (
    'RESP-CANVAS-NODE-INTERACTION-BOUNDARY',
    'web.component.canvas.CanvasNodeInteractionBoundary',
    'Own the shared DOM marker and target predicate that distinguish controls embedded in graph nodes from node-body selection.',
    'The presentation protocol for identifying embedded graph-node controls changes.',
    'CanvasNodeInteractionPolicy',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
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
values (
  'TEST-CANVAS-NODE-PORT-HANDLE',
  'web.component.canvas.CanvasNodePortHandle',
  'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodePortHandle.test.tsx'
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
values
  (
    'OBS-CANVAS-NODE-PORT-HANDLE-COMPONENT-PROFILE',
    'web.component.canvas.CanvasNodePortHandle',
    'CanvasNodePortHandle is observable through component-profile, component-integrity, and its focused presentation test.',
    'dashboard',
    true,
    'implemented'
  ),
  (
    'OBS-CANVAS-NODE-INTERACTION-BOUNDARY-COMPONENT-PROFILE',
    'web.component.canvas.CanvasNodeInteractionBoundary',
    'CanvasNodeInteractionBoundary is observable through component-profile, component-integrity, and the viewport interaction integration test.',
    'dashboard',
    true,
    'implemented'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 = 'cf3a393c12b3299e9b5d4bc67ded0ed759e25c4d279da5e085c4f17ae14fc886',
  revision = revision + 1
where component_id = 'web.component.canvas.CanvasNodeInteractionBoundary';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
refresh materialized view planning_query_store.component_engineering_component_tree_projection;

