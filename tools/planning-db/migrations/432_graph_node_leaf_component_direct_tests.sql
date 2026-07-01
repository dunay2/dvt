-- Register direct presentation-test evidence for GraphNodeCard leaf components.
-- Migration 428 intentionally introduced these leaves and their rails, but the
-- evidence was still attached to GraphNodeCardView.test.tsx. These files keep
-- each leaf's SRP proof local to the component without changing runtime code.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.GraphNodeStatusChip',
    'apps/web/src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove GraphNodeStatusChip renders only the supplied status label and tone token.',
      'rail', 'RenderCanvasGraphNodeStatusChip',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotDeriveCardState', true,
      'toneTokenCoverage', jsonb_build_array('success', 'warning')
    ),
    'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
    md5('file:GraphNodeStatusChip.test.tsx:432')
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove GraphNodeTagList renders already-selected display tags and honors the supplied visible limit.',
      'rail', 'RenderCanvasGraphNodeTagList',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotChooseTagsFromMetadata', true,
      'emptyInputOmitsComponent', true
    ),
    'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
    md5('file:GraphNodeTagList.test.tsx:432')
  ),
  (
    'web.component.canvas.GraphNodeMetricRow',
    'apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove GraphNodeMetricRow renders supplied metric labels and values without inventing missing operational metrics.',
      'rail', 'RenderCanvasGraphNodeMetricRow',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotInventMetrics', true,
      'emptyInputOmitsComponent', true
    ),
    'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
    md5('file:GraphNodeMetricRow.test.tsx:432')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest',
      'apps/web/src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
      'doesNotDeriveCardState',
      true,
      'presentationOnly',
      true
    ),
  source_path = 'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
  source_content_sha256 = md5('rail:GraphNodeStatusChip:direct-test:432'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeStatusChip'
  and rail_name = 'RenderCanvasGraphNodeStatusChip';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest',
      'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx',
      'doesNotChooseTagsFromMetadata',
      true,
      'emptyInputOmitsComponent',
      true,
      'presentationOnly',
      true
    ),
  source_path = 'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
  source_content_sha256 = md5('rail:GraphNodeTagList:direct-test:432'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTagList'
  and rail_name = 'RenderCanvasGraphNodeTagList';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest',
      'apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx',
      'doesNotInventMetrics',
      true,
      'emptyInputOmitsComponent',
      true,
      'presentationOnly',
      true
    ),
  source_path = 'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
  source_content_sha256 = md5('rail:GraphNodeMetricRow:direct-test:432'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeMetricRow'
  and rail_name = 'RenderCanvasGraphNodeMetricRow';

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
    'web.component.canvas.GraphNodeStatusChip',
    'EV-CANVAS-GRAPH-NODE-STATUS-CHIP-DIRECT-TEST',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
    'RenderCanvasGraphNodeStatusChip',
    'graph-node-status-chip',
    'GraphNodeStatusChip directly proves supplied label rendering and tone-token presentation without deriving status from a card or node.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
      'doesNotDeriveCardState', true,
      'toneTokenCoverage', jsonb_build_array('success', 'warning')
    ),
    'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
    md5('evidence:GraphNodeStatusChip:direct-test:432')
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'EV-CANVAS-GRAPH-NODE-TAG-LIST-DIRECT-TEST',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx',
    'RenderCanvasGraphNodeTagList',
    'graph-node-tag-list',
    'GraphNodeTagList directly proves supplied tag rendering, empty omission, and caller-owned visible limits without choosing tags from metadata.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeTagList.test.tsx',
      'doesNotChooseTagsFromMetadata', true,
      'emptyInputOmitsComponent', true
    ),
    'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
    md5('evidence:GraphNodeTagList:direct-test:432')
  ),
  (
    'web.component.canvas.GraphNodeMetricRow',
    'EV-CANVAS-GRAPH-NODE-METRIC-ROW-DIRECT-TEST',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx',
    'RenderCanvasGraphNodeMetricRow',
    'graph-node-metric-row',
    'GraphNodeMetricRow directly proves supplied metric rendering and empty omission without inventing missing row, size, or runtime metrics.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeMetricRow.test.tsx',
      'doesNotInventMetrics', true,
      'emptyInputOmitsComponent', true
    ),
    'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
    md5('evidence:GraphNodeMetricRow:direct-test:432')
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
      values ('EV-CANVAS-GRAPH-NODE-STATUS-CHIP-DIRECT-TEST')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest', 'apps/web/src/app/plugins/graph/GraphNodeStatusChip.test.tsx',
      'presentationOnly', true,
      'doesNotDeriveCardState', true
    ),
  source_path = 'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
  source_content_sha256 = md5('component:GraphNodeStatusChip:direct-test:432'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeStatusChip';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-TAG-LIST-DIRECT-TEST')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest', 'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx',
      'presentationOnly', true,
      'doesNotChooseTagsFromMetadata', true
    ),
  source_path = 'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
  source_content_sha256 = md5('component:GraphNodeTagList:direct-test:432'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTagList';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-METRIC-ROW-DIRECT-TEST')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest', 'apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx',
      'presentationOnly', true,
      'doesNotInventMetrics', true
    ),
  source_path = 'tools/planning-db/migrations/432_graph_node_leaf_component_direct_tests.sql',
  source_content_sha256 = md5('component:GraphNodeMetricRow:direct-test:432'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeMetricRow';
