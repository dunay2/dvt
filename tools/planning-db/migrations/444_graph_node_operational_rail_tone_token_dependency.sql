-- Declare the shared visual-token file used by GraphNodeOperationalRail for
-- operational metric tone rendering. The rail owns the use of the token map;
-- the shared token module remains the implementation surface for CSS classes.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeOperationalRail',
  'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
  'style-token',
  'graphNodeOperationalRailClasses.valueTone',
  jsonb_build_object(
    'responsibility', 'Provide tokenized value-tone classes consumed by GraphNodeOperationalRail.',
    'rail', 'RenderCanvasGraphNodeOperationalSummary',
    'sharedTokenFile', true,
    'ownedUse', 'operational metric tone rendering',
    'noHardcodedColorsInRail', true
  ),
  'tools/planning-db/migrations/444_graph_node_operational_rail_tone_token_dependency.sql',
  md5('file:graphVisualTokens.ts:GraphNodeOperationalRail:value-tone:444')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
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
  'web.component.canvas.GraphNodeOperationalRail',
  'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-TONE-TOKEN-OWNERSHIP',
  'architecture-test',
  'current',
  'pnpm planning:db:query frontend-component-files --component web.component.canvas.GraphNodeOperationalRail --limit 20',
  'RenderCanvasGraphNodeOperationalSummary',
  'graph-node-operational-rail',
  'Planning DB lists graphVisualTokens.ts as the style-token dependency for GraphNodeOperationalRail metric tone rendering.',
  jsonb_build_object(
    'query', 'frontend-component-files --component web.component.canvas.GraphNodeOperationalRail',
    'fileRole', 'style-token',
    'exportedSymbol', 'graphNodeOperationalRailClasses.valueTone',
    'sharedTokenFile', true
  ),
  'tools/planning-db/migrations/444_graph_node_operational_rail_tone_token_dependency.sql',
  md5('evidence:GraphNodeOperationalRail:value-tone-token-ownership:444')
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
      values ('EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-TONE-TOKEN-OWNERSHIP')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'styleTokenDependencies',
      jsonb_build_array('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeOperationalRailClasses.valueTone')
    ),
  source_path = 'tools/planning-db/migrations/444_graph_node_operational_rail_tone_token_dependency.sql',
  source_content_sha256 = md5('component:GraphNodeOperationalRail:value-tone-token-dependency:444'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail';
