-- Record the graph node card professional-width contract as DB-first evidence.
-- The card width is a presentation token owned by GraphVisualTokens and consumed
-- by GraphNodeCardView; it is not layout logic inside the card view.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'professionalCardWidth',
      jsonb_build_object(
        'token', 'graphNodeCardSurfaceClasses.root',
        'widthClass', 'w-[24rem]',
        'minWidthClass', 'min-w-[24rem]',
        'maxWidthClass', 'max-w-[24rem]',
        'replacesCompactWidth', 'min-w-[220px]',
        'manualRule', 'Graph node cards use stable product-grade dimensions rather than compact demo sizing.'
      )
    ),
  source_path = 'tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql',
  source_content_sha256 = md5('file:GraphVisualTokens:professional-card-width:461'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphVisualTokens'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'professionalCardWidthConsumption',
      jsonb_build_object(
        'slot', 'graph-node-card',
        'tokenSource', 'graphNodeCardSurfaceClasses.root',
        'rail', 'RenderCanvasGraphNodeCard',
        'presentationOnly', true,
        'noInlineWidthStyle', true
      )
    ),
  source_path = 'tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.tsx:professional-card-width:461'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'professionalCardWidthCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
        'assertsSlot', 'graph-node-card',
        'assertsWidthClass', 'w-[24rem]',
        'assertsMinWidthClass', 'min-w-[24rem]',
        'rejectsCompactWidthClass', 'min-w-[220px]'
      )
    ),
  source_path = 'tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.test.tsx:professional-card-width:461'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx';

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
  'EV-CANVAS-GRAPH-NODE-CARD-PROFESSIONAL-WIDTH',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-view',
  'GraphNodeCardView renders a stable product-grade card width through graph visual tokens instead of compact demo sizing.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'slot', 'graph-node-card',
    'token', 'graphNodeCardSurfaceClasses.root',
    'widthClass', 'w-[24rem]',
    'minWidthClass', 'min-w-[24rem]',
    'rejectsCompactWidthClass', 'min-w-[220px]',
    'manualRule', 'Graph node cards align to the professional visual manual and keep dimensions tokenized.'
  ),
  'tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql',
  md5('evidence:GraphNodeCardView:professional-card-width:461')
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
      values ('EV-CANVAS-GRAPH-NODE-CARD-PROFESSIONAL-WIDTH')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'professionalCardWidth',
      jsonb_build_object(
        'slot', 'graph-node-card',
        'tokenSource', 'web.component.canvas.GraphVisualTokens',
        'widthClass', 'w-[24rem]',
        'minWidthClass', 'min-w-[24rem]',
        'presentationOnly', true
      )
    ),
  source_path = 'tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql',
  source_content_sha256 = md5('component:GraphNodeCardView:professional-card-width:461'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardProfessionalWidth',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCardView',
        'rail', 'RenderCanvasGraphNodeCard',
        'tokenComponentId', 'web.component.canvas.GraphVisualTokens',
        'token', 'graphNodeCardSurfaceClasses.root',
        'widthClass', 'w-[24rem]'
      )
    ),
  source_path = 'tools/planning-db/migrations/461_graph_node_card_professional_width_contract.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardView:professional-card-width:461'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
