-- Complete GraphVisualTokens as the shared visual-token component and move
-- GraphNodeOperationalRail from file ownership to an explicit dependency.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-GRAPH-VISUAL-TOKENS',
  'web.component.canvas.GraphVisualTokens',
  'Own the shared graph presentation token groups used by graph cards, operational rails, health popovers, node ports, edge styling, and fallback node rendering.',
  'Change only when the graph visual token contract changes, not when a consuming card, rail, or popover changes behavior.',
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
  'TEST-GRAPH-VISUAL-TOKENS',
  'web.component.canvas.GraphVisualTokens',
  'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
  'architecture',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'
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
  'OBS-GRAPH-VISUAL-TOKENS-COMPONENT-PROFILE',
  'web.component.canvas.GraphVisualTokens',
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
  status
)
values (
  'REL-GRAPH-NODE-OPERATIONAL-RAIL-USES-GRAPH-VISUAL-TOKENS',
  'web.component.canvas.GraphNodeOperationalRail',
  'web.component.canvas.GraphVisualTokens',
  'depends_on',
  'outbound',
  'sync',
  'not_applicable',
  'canvas_presentation',
  jsonb_build_array(
    'RenderCanvasGraphNodeOperationalSummary',
    'RenderCanvasGraphVisualTokens',
    'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
    'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
    'GraphNodeOperationalRail no longer owns graphVisualTokens.ts; it consumes the GraphVisualTokens component.'
  ),
  'implemented'
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

update planning_query_store.frontend_component_validation_evidence
set
  evidence_ref = 'pnpm planning:db:query architecture-relations --component web.component.canvas.GraphNodeOperationalRail',
  proves = 'Planning DB models GraphNodeOperationalRail as a consumer of GraphVisualTokens instead of an owner of graphVisualTokens.ts.',
  raw_evidence = jsonb_build_object(
    'query', 'architecture-relations --component web.component.canvas.GraphNodeOperationalRail',
    'relationId', 'REL-GRAPH-NODE-OPERATIONAL-RAIL-USES-GRAPH-VISUAL-TOKENS',
    'tokenComponentId', 'web.component.canvas.GraphVisualTokens',
    'exportedSymbol', 'graphNodeOperationalRailClasses.valueTone',
    'sharedTokenFile', true
  ),
  source_path = 'tools/planning-db/migrations/478_graph_visual_tokens_consumer_maturity.sql',
  source_content_sha256 = md5('evidence:GraphNodeOperationalRail:value-tone-token-dependency:478'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and evidence_id = 'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-TONE-TOKEN-OWNERSHIP';

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'consumerRelations',
      jsonb_build_array(
        jsonb_build_object(
          'componentId', 'web.component.canvas.GraphNodeCardView',
          'relationId', 'REL-GRAPH-NODE-CARD-VIEW-USES-GRAPH-VISUAL-TOKENS',
          'rail', 'RenderCanvasGraphNodeCard'
        ),
        jsonb_build_object(
          'componentId', 'web.component.canvas.GraphNodeOperationalRail',
          'relationId', 'REL-GRAPH-NODE-OPERATIONAL-RAIL-USES-GRAPH-VISUAL-TOKENS',
          'rail', 'RenderCanvasGraphNodeOperationalSummary'
        )
      ),
      'maturityEvidence',
      jsonb_build_object(
        'responsibilityId', 'RESP-GRAPH-VISUAL-TOKENS',
        'testId', 'TEST-GRAPH-VISUAL-TOKENS',
        'observabilityId', 'OBS-GRAPH-VISUAL-TOKENS-COMPONENT-PROFILE'
      )
    ),
  source_path = 'tools/planning-db/migrations/478_graph_visual_tokens_consumer_maturity.sql',
  source_content_sha256 = md5('component:GraphVisualTokens:consumer-maturity:478'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphVisualTokens';

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'styleTokenDependencies',
      jsonb_build_array(
        jsonb_build_object(
          'tokenComponentId', 'web.component.canvas.GraphVisualTokens',
          'relationId', 'REL-GRAPH-NODE-OPERATIONAL-RAIL-USES-GRAPH-VISUAL-TOKENS',
          'symbol', 'graphNodeOperationalRailClasses.valueTone'
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/478_graph_visual_tokens_consumer_maturity.sql',
  source_content_sha256 = md5('component:GraphNodeOperationalRail:value-tone-token-dependency:478'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail';
