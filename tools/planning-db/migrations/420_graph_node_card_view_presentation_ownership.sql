-- Split GraphNodeCardView into its own presentation component. The card
-- strategy remains the read-model projection owner; the view owns only markup,
-- local interaction wiring, and composition of already-projected child views.

delete from planning_query_store.frontend_component_local_files
where component_id in (
    'web.component.canvas.GraphNodeCard',
    'web.component.canvas.GraphNodeCardStrategy'
  )
  and file_path in (
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'
  );

delete from planning_query_store.frontend_component_files
where component_id in (
    'web.component.canvas.GraphNodeCard',
    'web.component.canvas.GraphNodeCardStrategy'
  )
  and file_path in (
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'
  );

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
  'web.component.canvas.GraphNodeCardView',
  'GraphNodeCardView',
  'state-view',
  'current',
  'extract',
  'Frontend / Canvas',
  'Render the graph node card template from an already-projected GraphNodeCardReadModel and compose status, metric, tag, and operational rail child views without deriving business data.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-CANVAS-GRAPH-NODE-CARD-VIEW-PRESENTATION-OWNERSHIP'),
  jsonb_build_object(
    'dbFirst', true,
    'manualSections', jsonb_build_array(
      '3. Nuevo contrato de datos',
      '5. Layout nuevo de GraphNodeCardView',
      '12. Tests mínimos',
      '14. Planning DB / Governance'
    ),
    'fowlerSignal', 'responsibility_overload_between_read_model_strategy_and_presentational_template',
    'presentationOnly', true,
    'readModelOwner', 'web.component.canvas.GraphNodeCardStrategy',
    'renderRail', 'RenderCanvasGraphNodeCard',
    'composesComponents', jsonb_build_array(
      'web.component.canvas.GraphNodeStatusChip',
      'web.component.canvas.GraphNodeMetricRow',
      'web.component.canvas.GraphNodeTagList',
      'web.component.canvas.GraphNodeOperationalRail'
    ),
    'doesNotOwnRails', jsonb_build_array(
      'ProjectGraphNodeCardReadModel',
      'RenderGraphNodeCardMetrics',
      'RenderCanvasNodePortHandle'
    )
  ),
  'tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql',
  md5('component:GraphNodeCardView:presentation-ownership:420')
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

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeCardView',
  'web.canvas.graph',
  '/canvas',
  'graph-node-card-template',
  61,
  jsonb_build_object(
    'surfaceRole', 'Presentational card template inside React Flow graph nodes.',
    'hostComponents', jsonb_build_array(
      'web.component.canvas.GraphNodeCard',
      'web.component.canvas.DbtNodeCard'
    )
  ),
  'tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql',
  md5('surface:GraphNodeCardView:web.canvas.graph:420')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
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
    'web.component.canvas.GraphNodeCardView',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'presentation',
    'GraphNodeCardView',
    jsonb_build_object(
      'responsibility', 'Render graph node card markup from GraphNodeCardReadModel and delegate child rendering to leaf presentation components.',
      'rail', 'RenderCanvasGraphNodeCard',
      'presentationOnly', true,
      'composes', jsonb_build_array(
        'GraphNodeStatusChip',
        'GraphNodeMetricRow',
        'GraphNodeTagList',
        'GraphNodeOperationalRail'
      )
    ),
    'tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql',
    md5('file:GraphNodeCardView.tsx:presentation-ownership:420')
  ),
  (
    'web.component.canvas.GraphNodeCardView',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'GraphNodeCardView renders status, metrics, tags, play affordance, and operational rail from supplied props without deriving business data.',
      'rail', 'RenderCanvasGraphNodeCard',
      'testType', 'presentation'
    ),
    'tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql',
    md5('file:GraphNodeCardView.test.tsx:presentation-ownership:420')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
  'web.component.canvas.GraphNodeCardView',
  'RenderCanvasGraphNodeCard',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Render an already-projected graph node card view model as a presentational React template.',
    'owner', 'GraphNodeCardView',
    'readModelOwner', 'GraphNodeCardStrategy',
    'doesNotProjectData', true,
    'negativeTests', jsonb_build_array(
      'No invented metrics when the read model has no metrics.',
      'Operational rail click does not bubble to node selection.',
      'Play affordance uses supplied command only.'
    )
  ),
  'tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql',
  md5('rail:GraphNodeCardView:RenderCanvasGraphNodeCard:420')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
  'web.component.canvas.GraphNodeCardView',
  'EV-CANVAS-GRAPH-NODE-CARD-VIEW-PRESENTATION-OWNERSHIP',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-view',
  'GraphNodeCardView is the presentation owner for card markup and composes GraphNodeStatusChip, GraphNodeMetricRow, GraphNodeTagList, and GraphNodeOperationalRail without owning read-model projection.',
  jsonb_build_object(
    'redGreen', true,
    'governanceRedFailure', 'component-profile GraphNodeCardView returned no rows and GraphNodeCardView.tsx had duplicate GraphNodeCard/GraphNodeCardStrategy ownership.',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx'
  ),
  'tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql',
  md5('evidence:GraphNodeCardView:presentation-ownership:420')
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
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardViewPresentationOwnership',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCardView',
        'rail', 'RenderCanvasGraphNodeCard',
        'presentationOnly', true,
        'readModelOwner', 'web.component.canvas.GraphNodeCardStrategy',
        'composes', jsonb_build_array(
          'web.component.canvas.GraphNodeStatusChip',
          'web.component.canvas.GraphNodeMetricRow',
          'web.component.canvas.GraphNodeTagList',
          'web.component.canvas.GraphNodeOperationalRail'
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/420_graph_node_card_view_presentation_ownership.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardView:presentation-ownership:420'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
