-- Preserve running as a first-class Graph node card status tone.
-- This is a visible Canvas state, not a generic informational badge: the card
-- read model projects running and GraphNodeStatusChip renders a dedicated
-- running token.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'runningStatusToneCoverage',
      true,
      'expectedRunningTone',
      'running'
    ),
  source_path = 'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
  source_content_sha256 = md5('file:graphNodeCardReadModel.test.ts:running-status-tone:434'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'toneTokenCoverage',
      jsonb_build_array('success', 'warning', 'running'),
      'runningUsesDedicatedToken',
      true
    ),
  source_path = 'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
  source_content_sha256 = md5('file:GraphNodeStatusChip.test.tsx:running-status-tone:434'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeStatusChip'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeStatusChip.test.tsx';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'runningStatusTone',
      'running',
      'doesNotDowngradeRunningToInfo',
      true
    ),
  source_path = 'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
  source_content_sha256 = md5('rail:GraphNodeCard:running-status-tone:434'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and rail_name = 'RenderCanvasGraphNodeCard';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'runningToneToken',
      true,
      'doesNotUseGenericInfoForRunning',
      true
    ),
  source_path = 'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
  source_content_sha256 = md5('rail:GraphNodeStatusChip:running-status-tone:434'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeStatusChip'
  and rail_name = 'RenderCanvasGraphNodeStatusChip';

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
values
  (
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-GRAPH-NODE-RUNNING-STATUS-TONE',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'RenderCanvasGraphNodeCard',
    'graph-node-card-read-model',
    'GraphNodeCard read model preserves canonical and runtime running state as tone=running instead of downgrading it to info.',
    jsonb_build_object(
      'redGreen',
      true,
      'command',
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'canonicalRunningStatus',
      true,
      'runtimeRunningStatus',
      true,
      'expectedTone',
      'running'
    ),
    'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
    md5('evidence:GraphNodeCard:running-status-tone:434')
  ),
  (
    'web.component.canvas.GraphNodeStatusChip',
    'EV-CANVAS-GRAPH-NODE-STATUS-CHIP-RUNNING-TONE',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
    'RenderCanvasGraphNodeStatusChip',
    'graph-node-status-chip',
    'GraphNodeStatusChip renders a dedicated running tone token and does not reuse the generic info token for running state.',
    jsonb_build_object(
      'redGreen',
      true,
      'command',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
      'runningToneToken',
      true,
      'doesNotUseGenericInfoForRunning',
      true
    ),
    'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
    md5('evidence:GraphNodeStatusChip:running-status-tone:434')
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

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-RUNNING-STATUS-TONE')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'runningStatusTone',
      'running',
      'doesNotDowngradeRunningToInfo',
      true
    ),
  source_path = 'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
  source_content_sha256 = md5('component:GraphNodeCard:running-status-tone:434'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-STATUS-CHIP-RUNNING-TONE')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'runningToneToken',
      true,
      'doesNotUseGenericInfoForRunning',
      true
    ),
  source_path = 'tools/planning-db/migrations/434_graph_node_running_status_tone.sql',
  source_content_sha256 = md5('component:GraphNodeStatusChip:running-status-tone:434'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeStatusChip';
