-- Complete relational maturity evidence for GraphNodeOperationalSummary.
-- Migration 475 promoted the projection builder into a DB-queryable component;
-- this migration adds the evidence required by component-integrity.

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-GRAPH-NODE-OPERATIONAL-SUMMARY',
  'web.component.canvas.GraphNodeOperationalSummary',
  'Project recorded graph-node metadata and runtime facts into operational metrics and health detail rows without rendering UI or inventing placeholder metrics.',
  'Graph node source-health, schema-drift, model-execution, row, byte, cost, or duration projection rules change.',
  'CanvasGraphNodeCardProjection',
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
  'TEST-GRAPH-NODE-OPERATIONAL-SUMMARY',
  'web.component.canvas.GraphNodeOperationalSummary',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts'
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
  'OBS-GRAPH-NODE-OPERATIONAL-SUMMARY-COMPONENT-PROFILE',
  'web.component.canvas.GraphNodeOperationalSummary',
  'GraphNodeOperationalSummary is observable through component-profile, component-integrity, architecture-components, architecture-relations, and its focused unit test.',
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
