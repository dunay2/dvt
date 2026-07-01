-- Expose GraphNodeCardView child composition through relational architecture
-- facts. Earlier migrations stored the child component list inside JSON
-- metadata; DB-first reviews need queryable relations instead.

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score
)
values
  (
    'web.component.canvas.GraphNodeCardView',
    'GraphNodeCardView',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'RenderCanvasGraphNodeCard',
    'react',
    'high',
    'implemented',
    0.82
  ),
  (
    'web.component.canvas.GraphNodeStatusChip',
    'GraphNodeStatusChip',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx',
    'RenderCanvasGraphNodeCard',
    'react',
    'medium',
    'implemented',
    0.82
  ),
  (
    'web.component.canvas.GraphNodeMetricRow',
    'GraphNodeMetricRow',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx',
    'RenderCanvasGraphNodeCard',
    'react',
    'medium',
    'implemented',
    0.82
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'GraphNodeTagList',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/plugins/graph/GraphNodeTagList.tsx',
    'RenderCanvasGraphNodeCard',
    'react',
    'medium',
    'implemented',
    0.82
  ),
  (
    'web.component.canvas.GraphNodeOperationalRail',
    'GraphNodeOperationalRail',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
    'RenderCanvasGraphNodeCard',
    'react',
    'high',
    'implemented',
    0.82
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  updated_at = now();

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
values
  (
    'REL-GRAPH-NODE-CARD-VIEW-COMPOSES-STATUS-CHIP',
    'web.component.canvas.GraphNodeCardView',
    'web.component.canvas.GraphNodeStatusChip',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'canvas_presentation',
    jsonb_build_array(
      'RenderCanvasGraphNodeCard',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx',
      'pnpm planning:db:query architecture-relations --filter web.component.canvas.GraphNodeCardView'
    ),
    'implemented'
  ),
  (
    'REL-GRAPH-NODE-CARD-VIEW-COMPOSES-METRIC-ROW',
    'web.component.canvas.GraphNodeCardView',
    'web.component.canvas.GraphNodeMetricRow',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'canvas_presentation',
    jsonb_build_array(
      'RenderCanvasGraphNodeCard',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx',
      'pnpm planning:db:query architecture-relations --filter web.component.canvas.GraphNodeCardView'
    ),
    'implemented'
  ),
  (
    'REL-GRAPH-NODE-CARD-VIEW-COMPOSES-TAG-LIST',
    'web.component.canvas.GraphNodeCardView',
    'web.component.canvas.GraphNodeTagList',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'canvas_presentation',
    jsonb_build_array(
      'RenderCanvasGraphNodeCard',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeTagList.tsx',
      'pnpm planning:db:query architecture-relations --filter web.component.canvas.GraphNodeCardView'
    ),
    'implemented'
  ),
  (
    'REL-GRAPH-NODE-CARD-VIEW-COMPOSES-OPERATIONAL-RAIL',
    'web.component.canvas.GraphNodeCardView',
    'web.component.canvas.GraphNodeOperationalRail',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'canvas_presentation',
    jsonb_build_array(
      'RenderCanvasGraphNodeCard',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
      'pnpm planning:db:query architecture-relations --filter web.component.canvas.GraphNodeCardView'
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
  'web.component.canvas.GraphNodeCardView',
  'EV-CANVAS-GRAPH-NODE-CARD-VIEW-COMPOSITION-RELATIONS',
  'architecture-test',
  'current',
  'pnpm planning:db:query architecture-relations --filter web.component.canvas.GraphNodeCardView',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-view-composition',
  'GraphNodeCardView child presentation components are queryable as architecture relations instead of only as JSON metadata.',
  jsonb_build_object(
    'dbFirst', true,
    'relationType', 'contains',
    'architectureRelationsQuery', 'pnpm planning:db:query architecture-relations --filter web.component.canvas.GraphNodeCardView',
    'childComponents', jsonb_build_array(
      'web.component.canvas.GraphNodeStatusChip',
      'web.component.canvas.GraphNodeMetricRow',
      'web.component.canvas.GraphNodeTagList',
      'web.component.canvas.GraphNodeOperationalRail'
    )
  ),
  'tools/planning-db/migrations/472_graph_node_card_view_composition_relations.sql',
  md5('evidence:GraphNodeCardView:composition-relations:472')
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
