-- Make the existing Canvas node/edge authoring component visible to the
-- frontend component read models. Older architecture imports registered the
-- SYS-WEB-CANVAS-NODE-EDGE-AUTHORING component outside the frontend overlay;
-- local files and rails must join to an effective component row.

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  raw_component,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
  'CanvasNodeEdgeAuthoring',
  'canvas-viewport',
  'current',
  'harden',
  'Frontend / Canvas',
  'Owns Canvas node admission and edge authoring gestures, including governed connection proposals for visible draft nodes.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-WEB-CANVAS-EDGE-AUTHORING-VISIBLE-DRAFT-PORTS'),
  jsonb_build_object(
    'dbFirst', true,
    'parentComponentId', 'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'governingRail', 'AuthorCanvasGraphEdge',
    'fowlerSignal', 'published_policy_hidden_by_read_model_join'
  ),
  'tools/planning-db/migrations/398_canvas_node_edge_authoring_component_overlay.sql',
  md5('SYS-WEB-CANVAS-NODE-EDGE-AUTHORING:398')
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = coalesce(planning_query_store.frontend_component_local_components.raw_component, '{}'::jsonb)
    || excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
