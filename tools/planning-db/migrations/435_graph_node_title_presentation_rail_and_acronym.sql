-- Make GraphNodeTitlePresentation directly queryable as its own DB-first
-- component rail while preserving that the product-level parent rail remains
-- RenderCanvasGraphNodeCard. This also records the acronym hint rule used for
-- professional source titles such as ERP Orders.

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'leafRenderRail', 'RenderCanvasGraphNodeTitlePresentation',
    'parentRail', 'RenderCanvasGraphNodeCard',
    'acronymHintPrecedence', true,
    'viewTemplateBranching', false,
    'doesNotRender', true
  ),
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-ACRONYM-HINT')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql',
  source_content_sha256 = md5('component:GraphNodeTitlePresentation:rail-acronym:435'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeTitlePresentation',
  'RenderCanvasGraphNodeTitlePresentation',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Project canonical graph node identity into display title plus preserved technicalName for GraphNodeCard.',
    'parentRail', 'RenderCanvasGraphNodeCard',
    'inputModel', 'GraphNodeTitlePresentationInput',
    'outputModel', 'GraphNodeTitlePresentation',
    'deterministic', true,
    'doesNotRender', true,
    'viewTemplateBranching', false,
    'acronymHintPrecedence', true,
    'negativeTests', jsonb_build_array(
      'Does not render TSX markup.',
      'Does not mutate CanonicalNode data.',
      'Does not invent relation metadata when source hints are absent.'
    )
  ),
  'tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql',
  md5('rail:GraphNodeTitlePresentation:RenderCanvasGraphNodeTitlePresentation:435')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'rail', 'RenderCanvasGraphNodeTitlePresentation',
    'parentRail', 'RenderCanvasGraphNodeCard',
    'acronymHintPrecedence', true,
    'newInternalSymbol', 'displayIdentifier'
  ),
  source_path = 'tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.ts:435'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'coverage',
    jsonb_build_array(
      'source relation from metadata',
      'dbt sourceName/tableName projection',
      'dbt sourceName/tableName from nested metadata',
      'source relation from node data',
      'imported sourceName/tableName precedence over database/schema',
      'uppercase acronym hint preserved for matching source/schema names',
      'model suffix guard'
    ),
    'rail', 'RenderCanvasGraphNodeTitlePresentation'
  ),
  source_path = 'tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.test.ts:435'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts';

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
  'web.component.canvas.GraphNodeTitlePresentation',
  'EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-ACRONYM-HINT',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
  'RenderCanvasGraphNodeTitlePresentation',
  'node-card-title',
  'GraphNodeTitlePresentation preserves uppercase source/schema acronym hints while still preferring concrete sourceName/tableName identity over database/schema labels.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
    'acronymHintPrecedence', true,
    'technicalName', 'preserved',
    'doesNotRender', true
  ),
  'tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql',
  md5('evidence:GraphNodeTitlePresentation:acronym-hint:435')
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

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#displayIdentifier'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#titleCaseIdentifier')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('scripts/planning-db-migrate.test.cjs'),
        ('tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('node --test --test-name-pattern "Graph node title presentation rail" scripts/planning-db-migrate.test.cjs'),
        ('pnpm docs:feature-mechanization:implementation')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'graphNodeTitlePresentationAcronymHint',
    jsonb_build_object(
      'status', 'implemented',
      'componentId', 'web.component.canvas.GraphNodeTitlePresentation',
      'rail', 'RenderCanvasGraphNodeTitlePresentation',
      'parentRail', 'RenderCanvasGraphNodeCard',
      'symbols', jsonb_build_array('displayIdentifier', 'titleCaseIdentifier'),
      'acronymHintPrecedence', true,
      'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts')
    )
  ),
  source_path = 'tools/planning-db/migrations/435_graph_node_title_presentation_rail_and_acronym.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeTitlePresentation:435'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
