-- Complete relational maturity evidence for GraphNodeHealthPopover after the
-- contract ownership reconciliation registered it as an architecture component.
-- The popover owns the supplied-detail presentation only; shared strategy
-- contracts remain represented through component relations.

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-GRAPH-NODE-HEALTH-POPOVER',
  'web.component.canvas.GraphNodeHealthPopover',
  'Render the supplied graph node health detail rows and close affordance without deriving metrics, querying node data, or owning shared card strategy contracts.',
  'Graph node health popover detail presentation, close lifecycle presentation, or accessibility copy changes.',
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
values (
  'TEST-GRAPH-NODE-HEALTH-POPOVER',
  'web.component.canvas.GraphNodeHealthPopover',
  'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'
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
  'OBS-GRAPH-NODE-HEALTH-POPOVER-COMPONENT-PROFILE',
  'web.component.canvas.GraphNodeHealthPopover',
  'GraphNodeHealthPopover is observable through component-profile, component-integrity, architecture-relations, and its focused presentation test.',
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

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeHealthPopover',
  'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-MATURITY-EVIDENCE',
  'architecture-test',
  'current',
  'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeHealthPopover',
  'RenderCanvasNodeHealthPopover',
  'graph-node-health-popover-maturity-evidence',
  'GraphNodeHealthPopover has responsibility, test, and observability evidence as a presentation-only component consuming GraphNodeOperationalDetail.',
  jsonb_build_object(
    'dbFirst', true,
    'componentProfile', 'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeHealthPopover',
    'integrityCheck', 'pnpm planning:db:integrity:check',
    'focusedTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'
  ),
  'tools/planning-db/migrations/497_graph_node_health_popover_maturity_evidence.sql',
  md5('evidence:GraphNodeHealthPopoverMaturityEvidence:497')
)
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
