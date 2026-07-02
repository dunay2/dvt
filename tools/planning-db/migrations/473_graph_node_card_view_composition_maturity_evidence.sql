-- Complete relational maturity evidence for the GraphNodeCardView component
-- family. Migration 472 exposed the composition edges; this migration records
-- the Fowler ownership, required tests, and component-profile observability
-- that component-integrity expects for browser UI components.

update architecture.component
set
  maturity_score = null,
  updated_at = now()
where component_id in (
  'web.component.canvas.GraphNodeCardView',
  'web.component.canvas.GraphNodeStatusChip',
  'web.component.canvas.GraphNodeMetricRow',
  'web.component.canvas.GraphNodeTagList',
  'web.component.canvas.GraphNodeOperationalRail'
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
    'RESP-GRAPH-NODE-CARD-VIEW',
    'web.component.canvas.GraphNodeCardView',
    'Render the graph node card template from an already-projected GraphNodeCardReadModel and compose status, metric, tag, and operational rail child views without deriving business data.',
    'Graph node card markup, child composition, or presentation-only event wiring changes.',
    'CanvasGraphNodeCardPresentation',
    'implemented'
  ),
  (
    'RESP-GRAPH-NODE-STATUS-CHIP',
    'web.component.canvas.GraphNodeStatusChip',
    'Render the supplied graph node status label and tone without deriving node lifecycle state.',
    'Graph node status chip tone, label, or accessibility presentation changes.',
    'CanvasGraphNodeCardPresentation',
    'implemented'
  ),
  (
    'RESP-GRAPH-NODE-METRIC-ROW',
    'web.component.canvas.GraphNodeMetricRow',
    'Render supplied graph node metric name/value pairs without calculating operational metrics.',
    'Graph node metric row layout, empty-state, or metric item rendering changes.',
    'CanvasGraphNodeCardPresentation',
    'implemented'
  ),
  (
    'RESP-GRAPH-NODE-TAG-LIST',
    'web.component.canvas.GraphNodeTagList',
    'Render supplied graph node tags with the configured limit and tone without classifying node semantics.',
    'Graph node tag ordering, overflow, or tone presentation changes.',
    'CanvasGraphNodeCardPresentation',
    'implemented'
  ),
  (
    'RESP-GRAPH-NODE-OPERATIONAL-RAIL',
    'web.component.canvas.GraphNodeOperationalRail',
    'Render supplied operational metrics and optional health popover launcher without owning metric derivation or run commands.',
    'Graph node operational rail metric presentation, hover affordance, or popover launcher changes.',
    'CanvasGraphNodeCardPresentation',
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
values
  (
    'TEST-GRAPH-NODE-CARD-VIEW',
    'web.component.canvas.GraphNodeCardView',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx'
  ),
  (
    'TEST-GRAPH-NODE-STATUS-CHIP',
    'web.component.canvas.GraphNodeStatusChip',
    'apps/web/src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeStatusChip.test.tsx'
  ),
  (
    'TEST-GRAPH-NODE-METRIC-ROW',
    'web.component.canvas.GraphNodeMetricRow',
    'apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeMetricRow.test.tsx'
  ),
  (
    'TEST-GRAPH-NODE-TAG-LIST',
    'web.component.canvas.GraphNodeTagList',
    'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeTagList.test.tsx'
  ),
  (
    'TEST-GRAPH-NODE-OPERATIONAL-RAIL',
    'web.component.canvas.GraphNodeOperationalRail',
    'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'
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
    'OBS-GRAPH-NODE-CARD-VIEW-COMPONENT-PROFILE',
    'web.component.canvas.GraphNodeCardView',
    'GraphNodeCardView is observable through architecture-maturity, component-integrity, component-profile, and its focused presentation test.',
    'dashboard',
    true,
    'implemented'
  ),
  (
    'OBS-GRAPH-NODE-STATUS-CHIP-COMPONENT-PROFILE',
    'web.component.canvas.GraphNodeStatusChip',
    'GraphNodeStatusChip is observable through architecture-maturity, component-integrity, component-profile, and its focused presentation test.',
    'dashboard',
    true,
    'implemented'
  ),
  (
    'OBS-GRAPH-NODE-METRIC-ROW-COMPONENT-PROFILE',
    'web.component.canvas.GraphNodeMetricRow',
    'GraphNodeMetricRow is observable through architecture-maturity, component-integrity, component-profile, and its focused presentation test.',
    'dashboard',
    true,
    'implemented'
  ),
  (
    'OBS-GRAPH-NODE-TAG-LIST-COMPONENT-PROFILE',
    'web.component.canvas.GraphNodeTagList',
    'GraphNodeTagList is observable through architecture-maturity, component-integrity, component-profile, and its focused presentation test.',
    'dashboard',
    true,
    'implemented'
  ),
  (
    'OBS-GRAPH-NODE-OPERATIONAL-RAIL-COMPONENT-PROFILE',
    'web.component.canvas.GraphNodeOperationalRail',
    'GraphNodeOperationalRail is observable through architecture-maturity, component-integrity, component-profile, and its focused presentation test.',
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
