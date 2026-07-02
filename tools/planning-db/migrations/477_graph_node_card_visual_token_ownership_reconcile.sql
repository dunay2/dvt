-- Reconcile GraphNodeCardView visual token ownership. The card view consumes
-- graphVisualTokens.ts, but GraphVisualTokens owns the shared token source.
-- Keeping the token file under both components makes DB-first component
-- queries ambiguous and hides the style-token boundary.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

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
  status
)
values (
  'web.component.canvas.GraphVisualTokens',
  'GraphVisualTokens',
  'module',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
  'RenderCanvasGraphVisualTokens',
  'react',
  'medium',
  'implemented'
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
values (
  'REL-GRAPH-NODE-CARD-VIEW-USES-GRAPH-VISUAL-TOKENS',
  'web.component.canvas.GraphNodeCardView',
  'web.component.canvas.GraphVisualTokens',
  'depends_on',
  'outbound',
  'sync',
  'not_applicable',
  'canvas_presentation',
  jsonb_build_array(
    'RenderCanvasGraphNodeCard',
    'RenderCanvasGraphVisualTokens',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
    'pnpm planning:db:query architecture-relations --component web.component.canvas.GraphNodeCardView'
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

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'visualTokenOwnership',
      jsonb_build_object(
        'status', 'reconciled',
        'tokenComponentId', 'web.component.canvas.GraphVisualTokens',
        'tokenRail', 'RenderCanvasGraphVisualTokens',
        'consumerRelationId', 'REL-GRAPH-NODE-CARD-VIEW-USES-GRAPH-VISUAL-TOKENS',
        'rule', 'GraphNodeCardView no longer owns graphVisualTokens.ts; it consumes the GraphVisualTokens component.'
      )
    ),
  source_path = 'tools/planning-db/migrations/477_graph_node_card_visual_token_ownership_reconcile.sql',
  source_content_sha256 = md5('component:GraphNodeCardView:visual-token-ownership-reconcile:477'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView';

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
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/477_graph_node_card_visual_token_ownership_reconcile.sql',
  source_content_sha256 = md5('component:GraphVisualTokens:card-view-consumer:477'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphVisualTokens';

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
  'EV-CANVAS-GRAPH-NODE-CARD-VIEW-VISUAL-TOKEN-OWNERSHIP',
  'architecture-test',
  'current',
  'pnpm planning:db:query architecture-relations --component web.component.canvas.GraphNodeCardView',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-view-token-ownership',
  'GraphNodeCardView no longer owns graphVisualTokens.ts and instead has a queryable uses relation to GraphVisualTokens.',
  jsonb_build_object(
    'dbFirst', true,
    'removedFileOwnership', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
    'tokenComponentId', 'web.component.canvas.GraphVisualTokens',
    'relationId', 'REL-GRAPH-NODE-CARD-VIEW-USES-GRAPH-VISUAL-TOKENS',
    'profileQuery', 'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeCardView',
    'tokenProfileQuery', 'pnpm planning:db:query component-profile --component web.component.canvas.GraphVisualTokens'
  ),
  'tools/planning-db/migrations/477_graph_node_card_visual_token_ownership_reconcile.sql',
  md5('evidence:GraphNodeCardView:visual-token-ownership-reconcile:477')
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
