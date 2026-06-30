-- Register the node-local play affordance on the shared Canvas graph node card.
-- The action uses the existing execution-selection command; it does not invent
-- a run-from-node rail.

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
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'component',
    'GraphNodeCardView',
    jsonb_build_object(
      'role', 'shared graph node card presentation template',
      'rail', 'RenderCanvasGraphNodeCard',
      'ownsNodeLocalPlaySlot', true
    ),
    'tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql',
    md5('GraphNodeCardView.tsx:node-local-play:370')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'role', 'presentation coverage for node-local play affordance',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql',
    md5('GraphNodeCardView.test.tsx:node-local-play:370')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/graphNodeCardActions.ts',
    'read-model',
    'buildGraphNodeCardPlayAction',
    jsonb_build_object(
      'role', 'derive card-level action affordances from renderer data',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql',
    md5('graphNodeCardActions.ts:node-local-play:370')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts',
    'test',
    null,
    jsonb_build_object(
      'role', 'unit coverage for card-level action affordance derivation',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql',
    md5('graphNodeCardActions.test.ts:node-local-play:370')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'apps/web/src/app/plugins/dbt/DbtNodeRenderer.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'role', 'DBT renderer coverage for shared node-local play affordance',
      'rail', 'RenderDbtCanvasNodeCard'
    ),
    'tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql',
    md5('DbtNodeRenderer.test.tsx:node-local-play:370')
  )
on conflict (component_id, file_path, file_role) do update set
  file_role = excluded.file_role,
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_context_actions (
  component_id,
  context_id,
  action_id,
  action_label,
  action_kind,
  action_status,
  rail_name,
  action_order,
  raw_action,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeCard',
  'node-card',
  'toggle-execution-selection-from-card',
  'Select for execution',
  'selection-operation',
  'valid',
  'RenderCanvasGraphNodeCard',
  20,
  jsonb_build_object(
    'usesExistingCommand', 'ToggleCanvasExecutionSelection',
    'doesNotStartRun', true,
    'rationale', 'The card already has a local play affordance; current product semantics select the node for execution until a governed run-from-node rail exists.'
  ),
  'tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql',
  md5('GraphNodeCard:node-card:toggle-execution-selection-from-card:370')
)
on conflict (component_id, context_id, action_id) do update set
  action_label = excluded.action_label,
  action_kind = excluded.action_kind,
  action_status = excluded.action_status,
  rail_name = excluded.rail_name,
  action_order = excluded.action_order,
  raw_action = excluded.raw_action,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_contexts (
  component_id,
  context_id,
  context_kind,
  context_status,
  responsibility,
  raw_context,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeCard',
  'node-card',
  'node',
  'current',
  'Own node-local affordances rendered inside the shared graph node card without starting execution or duplicating node context-menu commands.',
  jsonb_build_object(
    'interactionScope', 'node-card',
    'spatialContext', false,
    'usesExistingExecutionSelectionCommand', true,
    'doesNotStartRun', true
  ),
  'tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql',
  md5('GraphNodeCard:node-card-context:370')
)
on conflict (component_id, context_id) do update set
  context_kind = excluded.context_kind,
  context_status = excluded.context_status,
  responsibility = excluded.responsibility,
  raw_context = excluded.raw_context,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
