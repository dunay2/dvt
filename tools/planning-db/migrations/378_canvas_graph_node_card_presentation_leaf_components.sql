-- Register GraphNodeCard presentation leaves after extracting the card template.

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
    'web.component.canvas.GraphNodeStatusChip',
    'apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx',
    'presentation',
    'GraphNodeStatusChip',
    jsonb_build_object(
      'responsibility', 'Render status chip from GraphNodeCardReadModel.status only.',
      'rail', 'RenderCanvasGraphNodeCard',
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql',
    md5('file:GraphNodeStatusChip.tsx:378')
  ),
  (
    'web.component.canvas.GraphNodeOperationalRail',
    'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
    'presentation',
    'GraphNodeOperationalRail',
    jsonb_build_object(
      'responsibility', 'Render operational metrics and optionally open operational details without bubbling node selection.',
      'rail', 'RenderCanvasGraphNodeOperationalSummary',
      'presentationOnly', true,
      'doesNotInventMetrics', true
    ),
    'tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql',
    md5('file:GraphNodeOperationalRail.tsx:378')
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'apps/web/src/app/plugins/graph/GraphNodeTagList.tsx',
    'presentation',
    'GraphNodeTagList',
    jsonb_build_object(
      'responsibility', 'Render already-selected graph node tags without deriving tags from plugin metadata.',
      'rail', 'RenderCanvasGraphNodeCard',
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql',
    md5('file:GraphNodeTagList.tsx:378')
  ),
  (
    'web.component.canvas.GraphNodeMetricRow',
    'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx',
    'presentation',
    'GraphNodeMetricRow',
    jsonb_build_object(
      'responsibility', 'Render summary metrics already projected into GraphNodeCardReadModel.metrics.',
      'rail', 'RenderCanvasGraphNodeCard',
      'presentationOnly', true,
      'doesNotInventMetrics', true
    ),
    'tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql',
    md5('file:GraphNodeMetricRow.tsx:378')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'fileOwnershipModel', 'owned-leaf-component-files',
      'fileCountZeroIsValid', false,
      'renderedInside', null
    ),
  source_path = 'tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql',
  source_content_sha256 = md5(component_id || ':presentation-leaf-components:378'),
  updated_at = now()
where component_id in (
  'web.component.canvas.GraphNodeStatusChip',
  'web.component.canvas.GraphNodeOperationalRail',
  'web.component.canvas.GraphNodeTagList',
  'web.component.canvas.GraphNodeMetricRow'
);

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
    'web.component.canvas.GraphNodeOperationalRail',
    'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-CLICK',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeOperationalSummary',
    'node-card',
    'GraphNodeCardView proves the operational rail can open details and stops event bubbling to the parent node card.',
    jsonb_build_object('redGreen', true, 'noFakeMetrics', true),
    'tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql',
    md5('evidence:GraphNodeOperationalRail:click:378')
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
        ('apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx#GraphNodeStatusChip'),
        ('apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx#GraphNodeStatusChipProps'),
        ('apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx#GraphNodeMetricRow'),
        ('apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx#GraphNodeMetricRowProps'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx#GraphNodeTagList'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx#GraphNodeTagListProps'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#GraphNodeOperationalRail'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#GraphNodeOperationalRailProps'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#renderMetrics'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#stopAndOpen')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeCardPresentationLeaves', jsonb_build_object(
          'status', 'implemented',
          'leafComponents', jsonb_build_array(
            'web.component.canvas.GraphNodeStatusChip',
            'web.component.canvas.GraphNodeMetricRow',
            'web.component.canvas.GraphNodeTagList',
            'web.component.canvas.GraphNodeOperationalRail'
          ),
          'railInteractivity', 'operational rail opens details through optional handler and stops node-card bubbling'
        )
      ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name',
          'GraphNodeStatusChip',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx',
          'dddOwner',
          'GraphNodeStatusChip',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_component', 'single_responsibility_leaf'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeStatusChipProps',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx',
          'dddOwner',
          'GraphNodeStatusChip',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'single_responsibility_leaf'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeMetricRow',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx',
          'dddOwner',
          'GraphNodeMetricRow',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_component', 'no_metric_derivation'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeMetricRowProps',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx',
          'dddOwner',
          'GraphNodeMetricRow',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'no_metric_derivation'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeTagList',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeTagList.tsx',
          'dddOwner',
          'GraphNodeTagList',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_component', 'no_tag_derivation'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeTagListProps',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeTagList.tsx',
          'dddOwner',
          'GraphNodeTagList',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'no_tag_derivation'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeOperationalRail',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
          'dddOwner',
          'GraphNodeOperationalRail',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('presentation_component', 'no_metric_derivation', 'event_bubble_guard'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeOperationalRailProps',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
          'dddOwner',
          'GraphNodeOperationalRail',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'event_bubble_guard'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'renderMetrics',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
          'dddOwner',
          'GraphNodeOperationalRail',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('presentation_helper', 'no_metric_derivation'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'stopAndOpen',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
          'dddOwner',
          'GraphNodeOperationalRail',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('presentation_helper', 'event_bubble_guard'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/378_canvas_graph_node_card_presentation_leaf_components.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCard:presentation-leaves:378'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
