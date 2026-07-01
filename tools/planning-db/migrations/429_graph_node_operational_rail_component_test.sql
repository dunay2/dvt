-- Register direct component-test evidence for GraphNodeOperationalRail.
-- The rail is a presentation leaf: it renders supplied metrics, requires
-- supplied accessibility copy when interactive, and hands the anchor rect to
-- the operational detail popover without bubbling to the node card.

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
  'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
  'presentation-test',
  null,
  jsonb_build_object(
    'responsibility', 'Prove GraphNodeOperationalRail null, static, and interactive presentation behavior directly.',
    'rail', 'RenderCanvasGraphNodeOperationalSummary',
    'presentationOnly', true,
    'requiresSuppliedAriaLabel', true,
    'suppliedAccessibleLabel', 'Open source health metrics',
    'keyboardOpen', true,
    'stopPropagation', true,
    'anchorRectHandoff', true
  ),
  'tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql',
  md5('file:GraphNodeOperationalRail.test.tsx:429')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = raw_file || jsonb_build_object(
    'interactiveContract', jsonb_build_object(
      'requiresSuppliedAriaLabel', true,
      'doesNotUseFallbackCopy', true,
      'keyboardOpen', true,
      'stopPropagation', true
    )
  ),
  source_path = 'tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql',
  source_content_sha256 = md5('file:GraphNodeOperationalRail:component-test:429'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = raw_file || jsonb_build_object(
    'operationalRailComposition', jsonb_build_object(
      'interactiveRailRequiresOperationalDetail', true,
      'passesSuppliedAccessibleLabel', true,
      'staticRailWhenNoDetailOpener', true
    )
  ),
  source_path = 'tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql',
  source_content_sha256 = md5('file:GraphNodeCardView:operational-rail-composition:429'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'componentTest',
      'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
      'requiresSuppliedAriaLabel',
      true,
      'suppliedAccessibleLabel',
      'Open source health metrics',
      'keyboardOpen',
      true,
      'stopPropagation',
      true,
      'anchorRectHandoff',
      true,
      'doesNotInventMetrics',
      true
    ),
  source_path = 'tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:component-test:429'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and rail_name = 'RenderCanvasGraphNodeOperationalSummary';

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
  'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-COMPONENT-TEST',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
  'RenderCanvasGraphNodeOperationalSummary',
  'graph-node-operational-rail',
  'GraphNodeOperationalRail directly proves null/static/interactive rendering, supplied accessible copy, keyboard opening, anchor handoff, and stopPropagation without deriving metrics.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'Expected accessible label to be supplied by the interactive rail contract before GraphNodeOperationalRail required ariaLabel for onOpen.',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
    'requiresSuppliedAriaLabel', true,
    'suppliedAccessibleLabel', 'Open source health metrics',
    'keyboardOpen', true,
    'stopPropagation', true,
    'anchorRectHandoff', true
  ),
  'tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql',
  md5('evidence:GraphNodeOperationalRail:component-test:429')
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
      values ('EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-COMPONENT-TEST')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
      'requiresSuppliedAriaLabelWhenInteractive', true,
      'doesNotInventMetrics', true
    ),
  source_path = 'tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql',
  source_content_sha256 = md5('component:GraphNodeOperationalRail:component-test:429'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#GraphNodeOperationalRailInteractiveProps'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#GraphNodeOperationalRailStaticProps')
    ) updated_refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeOperationalRailComponentTest',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeOperationalRail',
        'rail', 'RenderCanvasGraphNodeOperationalSummary',
        'test', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
        'requiresSuppliedAriaLabel', true,
        'keyboardOpen', true,
        'stopPropagation', true
      )
    ),
  source_path = 'tools/planning-db/migrations/429_graph_node_operational_rail_component_test.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeOperationalRail:component-test:429'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
