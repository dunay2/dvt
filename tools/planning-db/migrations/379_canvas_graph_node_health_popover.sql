-- Register the Graph node health popover as the DB-first operational-detail
-- host connected to the existing GraphNodeCard operational rail.

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
    'web.component.canvas.GraphNodeHealthPopover',
    'GraphNodeHealthPopover',
    'state-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Own the contextual operational detail popover opened from the graph node operational rail without consulting node data or inventing metrics.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    jsonb_build_array(
      'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx',
      'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'
    ),
    jsonb_build_object(
      'dbFirst', true,
      'parentComponentId', 'web.component.canvas.GraphNodeCard',
      'hostComponentId', 'web.component.canvas.CanvasViewport',
      'fileOwnershipModel', 'owned-leaf-component-files',
      'governingRails', jsonb_build_array(
        'OpenCanvasNodeHealthPopover',
        'CloseCanvasNodeHealthPopover',
        'RenderCanvasNodeHealthPopover'
      ),
      'invariants', jsonb_build_array(
        'GraphNodeHealthPopoverView receives already resolved detail rows',
        'CanvasViewport owns open and close lifecycle',
        'GraphNodeOperationalRail click does not bubble into node selection'
      )
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('web.component.canvas.GraphNodeHealthPopover:379')
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

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'OpenCanvasNodeHealthPopover',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'kind', 'command',
      'dddObject', 'NodeHealthPopoverModel',
      'applicationPort', 'node.data.onOpenOperationalDetails',
      'adapterSurface', 'CanvasViewport',
      'negativeTests', jsonb_build_array(
        'open command must not select the node',
        'open command must not query node metadata directly',
        'open command must anchor to the clicked operational rail'
      )
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('rail:GraphNodeHealthPopover:OpenCanvasNodeHealthPopover:379')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'CloseCanvasNodeHealthPopover',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'kind', 'command',
      'dddObject', 'NodeHealthPopoverModel',
      'applicationPort', 'CanvasViewport close handlers',
      'adapterSurface', 'CanvasViewportSurfaceView',
      'negativeTests', jsonb_build_array(
        'pane click closes the popover',
        'node removal closes the popover',
        'Escape closes the popover view'
      )
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('rail:GraphNodeHealthPopover:CloseCanvasNodeHealthPopover:379')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'RenderCanvasNodeHealthPopover',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'kind', 'query',
      'dddObject', 'GraphNodeOperationalDetail',
      'applicationPort', 'GraphNodeCardView.onOpenOperationalDetails',
      'adapterSurface', 'GraphNodeHealthPopoverView',
      'negativeTests', jsonb_build_array(
        'popover renders detail rows from the supplied detail only',
        'missing operational metrics cannot produce fake rows',
        'Escape handling does not mutate graph selection'
      )
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('rail:GraphNodeHealthPopover:RenderCanvasNodeHealthPopover:379')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
values
  (
    'web.component.canvas.GraphNodeOperationalRail',
    'RenderCanvasGraphNodeOperationalSummary',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'kind', 'query',
      'dddObject', 'GraphNodeCardReadModel.operationalMetrics',
      'applicationPort', 'GraphNodeOperationalRailProps.metrics',
      'adapterSurface', 'GraphNodeOperationalRail',
      'negativeTests', jsonb_build_array(
        'rail only renders supplied metrics',
        'rail only opens details when an operational detail handler exists',
        'rail click must not bubble into node selection'
      )
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('rail:GraphNodeOperationalRail:RenderCanvasGraphNodeOperationalSummary:379')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
    'web.component.canvas.GraphNodeHealthPopover',
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
    'presentation',
    'GraphNodeHealthPopoverView',
    jsonb_build_object(
      'responsibility', 'Render supplied operational detail rows in a contextual popover.',
      'rail', 'RenderCanvasNodeHealthPopover',
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('file:GraphNodeHealthPopoverView.tsx:379')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'host-state',
    'NodeHealthPopoverModel',
    jsonb_build_object(
      'responsibility', 'Host the graph node health popover lifecycle and inject the open port into rendered nodes.',
      'rails', jsonb_build_array('OpenCanvasNodeHealthPopover', 'CloseCanvasNodeHealthPopover')
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('file:CanvasViewport:NodeHealthPopoverModel:379')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
    'host-render',
    'CanvasViewportSurfaceView',
    jsonb_build_object(
      'responsibility', 'Render the node health popover host view and close it from canvas lifecycle events.',
      'rails', jsonb_build_array('CloseCanvasNodeHealthPopover', 'RenderCanvasNodeHealthPopover')
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('file:CanvasViewportSurfaceView:health-popover:379')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
    'contract',
    'GraphNodeOperationalDetail',
    jsonb_build_object(
      'responsibility', 'Define the supplied detail model rendered by GraphNodeHealthPopoverView.',
      'rail', 'RenderCanvasNodeHealthPopover'
    ),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('file:graphNodeCardStrategyContracts:GraphNodeOperationalDetail:379')
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
    'web.component.canvas.GraphNodeHealthPopover',
    'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-VIEW',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx',
    'RenderCanvasNodeHealthPopover',
    'node-card',
    'GraphNodeHealthPopoverView renders supplied operational rows and closes on Escape.',
    jsonb_build_object('redGreen', true, 'noDataLookup', true),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('evidence:GraphNodeHealthPopoverView:379')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-HOST',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
    'OpenCanvasNodeHealthPopover',
    'canvas-viewport',
    'CanvasViewport injects the open port into nodes, opens the popover, and closes it on pane click.',
    jsonb_build_object('redGreen', true, 'noWorkbenchOpen', true),
    'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
    md5('evidence:CanvasViewport:node-health-popover:379')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts#GraphNodeOperationalDetail'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#buildGraphNodeOperationalDetail'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx#GraphNodeHealthPopoverViewProps'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx#buildPopoverStyle'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx#GraphNodeHealthPopoverView'),
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx#NodeHealthPopoverModel')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeHealthPopover', jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.GraphNodeHealthPopover',
          'rails', jsonb_build_array(
            'OpenCanvasNodeHealthPopover',
            'CloseCanvasNodeHealthPopover',
            'RenderCanvasNodeHealthPopover'
          ),
          'noDataLookup', true,
          'hostedBy', 'CanvasViewport'
        )
      ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name',
          'GraphNodeOperationalDetail',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
          'dddOwner',
          'GraphNodeHealthPopover',
          'cqRails',
          jsonb_build_array('RenderCanvasNodeHealthPopover'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'no_data_lookup'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array(
            'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
            'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'
          )
        ),
        jsonb_build_object(
          'name',
          'buildGraphNodeOperationalDetail',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner',
          'GraphNodeHealthPopover',
          'cqRails',
          jsonb_build_array('RenderCanvasNodeHealthPopover'),
          'fowlerSignals',
          jsonb_build_array('read_model_projection', 'no_view_derivation'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array(
            'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
            'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'
          )
        ),
        jsonb_build_object(
          'name',
          'GraphNodeHealthPopoverViewProps',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
          'dddOwner',
          'GraphNodeHealthPopover',
          'cqRails',
          jsonb_build_array('RenderCanvasNodeHealthPopover'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'positioned_view'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'buildPopoverStyle',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
          'dddOwner',
          'GraphNodeHealthPopover',
          'cqRails',
          jsonb_build_array('RenderCanvasNodeHealthPopover'),
          'fowlerSignals',
          jsonb_build_array('presentation_helper', 'positioned_view'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeHealthPopoverView',
          'path',
          'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
          'dddOwner',
          'GraphNodeHealthPopover',
          'cqRails',
          jsonb_build_array('RenderCanvasNodeHealthPopover', 'CloseCanvasNodeHealthPopover'),
          'fowlerSignals',
          jsonb_build_array('presentation_component', 'no_data_lookup', 'escape_close'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'NodeHealthPopoverModel',
          'path',
          'apps/web/src/app/views/canvas/CanvasViewport.tsx',
          'dddOwner',
          'GraphNodeHealthPopover',
          'cqRails',
          jsonb_build_array('OpenCanvasNodeHealthPopover', 'CloseCanvasNodeHealthPopover'),
          'fowlerSignals',
          jsonb_build_array('host_state', 'lifecycle_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx')
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/379_canvas_graph_node_health_popover.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeHealthPopover:379'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
