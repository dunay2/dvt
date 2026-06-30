-- Register the GraphNodeTitlePresentation leaf as the read-model title mapper
-- for GraphNodeCard. The title mapper is not a separate product capability and
-- does not create a parallel CQ rail; it supports RenderCanvasGraphNodeCard by
-- converting technical node identifiers into display titles while preserving
-- the original technicalName for inspection/tooltips.

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
values
  (
    'web.component.canvas.GraphNodeTitlePresentation',
    'GraphNodeTitlePresentation',
    'query-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Build the display title and preserved technicalName for GraphNodeCard read models without rendering or plugin-specific branching in the view template.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    jsonb_build_array(
      'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'
    ),
    jsonb_build_object(
      'dbFirst', true,
      'parentComponentId', 'web.component.canvas.GraphNodeCard',
      'fileOwnershipModel', 'owned-leaf-component-files',
      'governingRail', 'RenderCanvasGraphNodeCard',
      'presentationOnly', false,
      'viewTemplateBranching', false,
      'preservesTechnicalName', true,
      'manualReference', 'buzon/manual de implementacion.txt'
    ),
    'tools/planning-db/migrations/391_graph_node_title_presentation.sql',
    md5('web.component.canvas.GraphNodeTitlePresentation:391')
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
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
    'web.component.canvas.GraphNodeTitlePresentation',
    'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
    'read-model-presenter',
    'buildGraphNodeTitlePresentation',
    jsonb_build_object(
      'responsibility', 'Maps CanonicalNode technical identifiers and metadata into display title plus preserved technicalName.',
      'railOwnerComponentId', 'web.component.canvas.GraphNodeCard',
      'governingRail', 'RenderCanvasGraphNodeCard',
      'pluginScope', jsonb_build_array('dbt', 'dvt'),
      'preservesTechnicalName', true,
      'doesNotRender', true
    ),
    'tools/planning-db/migrations/391_graph_node_title_presentation.sql',
    md5('file:graphNodeTitlePresentation.ts:391')
  ),
  (
    'web.component.canvas.GraphNodeTitlePresentation',
    'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves source/model display title projection and technicalName preservation.',
      'governingRail', 'RenderCanvasGraphNodeCard',
      'redGreen', true
    ),
    'tools/planning-db/migrations/391_graph_node_title_presentation.sql',
    md5('file:graphNodeTitlePresentation.test.ts:391')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
values
  (
    'web.component.canvas.GraphNodeTitlePresentation',
    'EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
    'RenderCanvasGraphNodeCard',
    'node-card',
    'GraphNodeTitlePresentation proves human source/model titles and preserves the original technicalName for the card view.',
    jsonb_build_object(
      'redGreen', true,
      'sourceContextTitle', true,
      'modelSuffixGuard', true,
      'technicalName', 'preserved'
    ),
    'tools/planning-db/migrations/391_graph_node_title_presentation.sql',
    md5('evidence:GraphNodeTitlePresentation:title-projection:391')
  ),
  (
    'web.component.canvas.GraphNodeTitlePresentation',
    'EV-CANVAS-GRAPH-NODE-CARD-TITLE-TOOLTIP',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeCard',
    'node-card',
    'GraphNodeCardView proves the template renders the supplied title and exposes technicalName as tooltip text without recomputing it.',
    jsonb_build_object('presentationOnly', true, 'technicalName', 'title-attribute'),
    'tools/planning-db/migrations/391_graph_node_title_presentation.sql',
    md5('evidence:GraphNodeTitlePresentation:view-tooltip:391')
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
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#GraphNodeTitlePresentation'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#GraphNodeTitlePresentationInput'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#buildGraphNodeTitlePresentation'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#stringValue'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#titleCaseIdentifier'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts#GraphNodeCardReadModel.technicalName')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('tools/planning-db/migrations/391_graph_node_title_presentation.sql')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('scripts/planning-db-migrate.test.cjs'),
        ('tools/planning-db/migrations/391_graph_node_title_presentation.sql')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('node --test --test-name-pattern "Graph node title presentation ownership" scripts/planning-db-migrate.test.cjs'),
        ('pnpm docs:feature-mechanization:implementation')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeTitlePresentation',
        jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.GraphNodeTitlePresentation',
          'parentComponentId', 'web.component.canvas.GraphNodeCard',
          'rail', 'RenderCanvasGraphNodeCard',
          'symbols', jsonb_build_array(
            'GraphNodeTitlePresentation',
            'GraphNodeTitlePresentationInput',
            'buildGraphNodeTitlePresentation',
            'stringValue',
            'titleCaseIdentifier',
            'GraphNodeCardReadModel.technicalName'
          ),
          'technicalName', 'preserved',
          'viewTemplateBranching', false,
          'completionGate', jsonb_build_array(
            'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts',
            'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx',
            'node --test --test-name-pattern "Graph node title presentation ownership" scripts/planning-db-migrate.test.cjs',
            'pnpm docs:feature-mechanization:implementation'
          )
        )
      ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name', 'GraphNodeTitlePresentation',
          'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
          'dddOwner', 'GraphNodeTitlePresentation',
          'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
          'fowlerSignals', jsonb_build_array('read_model_presenter', 'technical_name_preservation'),
          'cypressCoverage', 'not_applicable:read_model_projection_unit_and_presentation_covered',
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs'
        ),
        jsonb_build_object(
          'name', 'GraphNodeTitlePresentationInput',
          'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
          'dddOwner', 'GraphNodeTitlePresentation',
          'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
          'fowlerSignals', jsonb_build_array('read_model_presenter_input_contract'),
          'cypressCoverage', 'not_applicable:read_model_projection_unit_and_presentation_covered',
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs'
        ),
        jsonb_build_object(
          'name', 'buildGraphNodeTitlePresentation',
          'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
          'dddOwner', 'GraphNodeTitlePresentation',
          'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
          'fowlerSignals', jsonb_build_array('read_model_presenter', 'no_view_template_branching'),
          'cypressCoverage', 'not_applicable:read_model_projection_unit_and_presentation_covered',
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs'
        ),
        jsonb_build_object(
          'name', 'stringValue',
          'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
          'dddOwner', 'GraphNodeTitlePresentation',
          'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
          'fowlerSignals', jsonb_build_array('internal_projection_helper'),
          'cypressCoverage', 'not_applicable:read_model_projection_unit_and_presentation_covered',
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs'
        ),
        jsonb_build_object(
          'name', 'titleCaseIdentifier',
          'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
          'dddOwner', 'GraphNodeTitlePresentation',
          'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
          'fowlerSignals', jsonb_build_array('internal_projection_helper', 'display_name_projection'),
          'cypressCoverage', 'not_applicable:read_model_projection_unit_and_presentation_covered',
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs'
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/391_graph_node_title_presentation.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeTitlePresentation:391'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
