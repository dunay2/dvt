-- Complete architecture maturity for GraphNodeCardStrategy after migration
-- 481 registered it as an architecture component to support explicit
-- dependency relations.

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-GRAPH-NODE-CARD-STRATEGY',
  'web.component.canvas.GraphNodeCardStrategy',
  'Project canonical graph nodes into GraphNodeCardReadModel values and delegate specialized title and operational summary projections to their owned query components.',
  'Change only when graph node card read-model projection rules or strategy adapter composition changes.',
  'Frontend / Canvas',
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
  'TEST-GRAPH-NODE-CARD-STRATEGY-READ-MODEL',
  'web.component.canvas.GraphNodeCardStrategy',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts'
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
  'OBS-GRAPH-NODE-CARD-STRATEGY-COMPONENT-PROFILE',
  'web.component.canvas.GraphNodeCardStrategy',
  'component-profile',
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
  'web.component.canvas.GraphNodeCardStrategy',
  'EV-CANVAS-GRAPH-NODE-CARD-STRATEGY-MATURITY',
  'architecture-test',
  'current',
  'pnpm planning:db:query component-integrity --component web.component.canvas.GraphNodeCardStrategy',
  'ProjectGraphNodeCardReadModel',
  'graph-node-card-strategy-maturity',
  'GraphNodeCardStrategy has architecture responsibility, required test evidence, observability, and clean component-integrity after ownership drift reconciliation.',
  jsonb_build_object(
    'dbFirst', true,
    'responsibilityId', 'RESP-GRAPH-NODE-CARD-STRATEGY',
    'testId', 'TEST-GRAPH-NODE-CARD-STRATEGY-READ-MODEL',
    'observabilityId', 'OBS-GRAPH-NODE-CARD-STRATEGY-COMPONENT-PROFILE',
    'validationQueries', jsonb_build_array(
      'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeCardStrategy',
      'pnpm planning:db:query component-integrity --component web.component.canvas.GraphNodeCardStrategy'
    )
  ),
  'tools/planning-db/migrations/482_graph_node_card_strategy_maturity.sql',
  md5('evidence:GraphNodeCardStrategy:maturity:482')
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
