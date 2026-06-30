-- Register the GraphNodeCard operational surface as DB-first component
-- ownership. The implementation keeps DBT/DVT semantics in strategies and
-- keeps GraphNodeCardView as a presentational template.

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
    'web.component.canvas.GraphNodeCard',
    'GraphNodeCard',
    'state-view',
    'current',
    'harden',
    'Frontend / Canvas',
    'Own the shared graph node card presentation template, semantic read model contract, status chip, tag row, node-local play affordance, and NiFi-style operational rail without owning DBT/DVT business semantics.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'governingRail', 'RenderCanvasGraphNodeCard',
      'operationalRail', 'RenderCanvasGraphNodeOperationalSummary',
      'presentationOnlyTemplate', true,
      'strategyOwnedSemantics', jsonb_build_array(
        'defaultGraphNodeCardStrategy',
        'dbtGraphNodeCardStrategy',
        'dvtGraphNodeCardStrategy'
      ),
      'componentFamily', jsonb_build_array(
        'web.component.canvas.GraphNodeStatusChip',
        'web.component.canvas.GraphNodeOperationalRail',
        'web.component.canvas.GraphNodeTagList',
        'web.component.canvas.GraphNodeMetricRow',
        'web.component.canvas.GraphNodeCardPlayAction'
      ),
      'invariants', jsonb_build_array(
        'GraphNodeCardView does not inspect CanonicalNode or plugin metadata',
        'DBT/DVT strategies compute status and operational metrics before render',
        'Operational rail displays only recorded metrics',
        'Card-local play toggles execution selection and does not start a run'
      )
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('web.component.canvas.GraphNodeCard:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeStatusChip',
    'GraphNodeStatusChip',
    'state-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Own the presentational status chip vocabulary rendered from GraphNodeCardReadModel.status.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'parentComponentId', 'web.component.canvas.GraphNodeCard',
      'fileOwnershipModel', 'shared-template-subcomponent-no-owned-files',
      'fileCountZeroIsValid', true,
      'renderedInside', 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'tones', jsonb_build_array('neutral', 'info', 'success', 'warning', 'danger')
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('web.component.canvas.GraphNodeStatusChip:377')
  ),
  (
    'web.component.canvas.GraphNodeOperationalRail',
    'GraphNodeOperationalRail',
    'state-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Own the presentational NiFi-style node operational metrics rail rendered from GraphNodeCardReadModel.operationalMetrics.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'parentComponentId', 'web.component.canvas.GraphNodeCard',
      'fileOwnershipModel', 'shared-template-subcomponent-no-owned-files',
      'fileCountZeroIsValid', true,
      'rail', 'RenderCanvasGraphNodeOperationalSummary',
      'renderedInside', 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'doesNotInventMetrics', true
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('web.component.canvas.GraphNodeOperationalRail:377')
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'GraphNodeTagList',
    'state-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Own the presentational tag row rendered from already selected node tags.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'parentComponentId', 'web.component.canvas.GraphNodeCard',
      'fileOwnershipModel', 'shared-template-subcomponent-no-owned-files',
      'fileCountZeroIsValid', true,
      'renderedInside', 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('web.component.canvas.GraphNodeTagList:377')
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
    'web.component.canvas.GraphNodeCard',
    'RenderCanvasGraphNodeCard',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'kind', 'query',
      'dddObject', 'GraphNodeCardReadModel',
      'applicationPort', 'graph-node-card-strategy',
      'adapterSurface', 'GraphNodeCardView',
      'negativeTests', jsonb_build_array(
        'GraphNodeCardView must not read CanonicalNode or plugin metadata',
        'unavailable play action must not render fake execution success',
        'plugin strategies must not bypass GraphNodeCardReadModel'
      )
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('rail:GraphNodeCard:RenderCanvasGraphNodeCard:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'RenderCanvasGraphNodeOperationalSummary',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'kind', 'query',
      'dddObject', 'GraphNodeOperationalMetric[]',
      'applicationPort', 'dbt/dvt graph node card strategies',
      'adapterSurface', 'GraphNodeOperationalRail',
      'negativeTests', jsonb_build_array(
        'rail only renders operationalMetrics from the read model',
        'missing metrics produce no placeholder rail values',
        'DBT source readiness is based on source kind, not generic input role'
      )
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('rail:GraphNodeCard:RenderCanvasGraphNodeOperationalSummary:377')
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
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
    'contract',
    'GraphNodeCardReadModel',
    jsonb_build_object(
      'responsibility', 'Defines the read-model contract for status, path, metrics, and operational rail.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:graphNodeCardStrategyContracts.ts:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts',
    'model',
    'buildGraphNodeCardReadModel',
    jsonb_build_object(
      'responsibility', 'Selects the plugin-owned strategy that builds GraphNodeCardReadModel.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:graphNodeCardReadModel.ts:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'presentation',
    'GraphNodeCardView',
    jsonb_build_object(
      'responsibility', 'Presentation-only graph card template with status chip and operational rail.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:GraphNodeCardView.tsx:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
    'style-token',
    'graphVisualClasses',
    jsonb_build_object(
      'responsibility', 'Central graph visual tokens for cards, chips, tags, and operational rail.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:graphVisualTokens.ts:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts',
    'strategy',
    'defaultGraphNodeCardStrategy',
    jsonb_build_object(
      'responsibility', 'Fallback strategy for generic graph nodes.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:defaultGraphNodeCardStrategy.ts:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
    'strategy',
    'dbtGraphNodeCardStrategy',
    jsonb_build_object(
      'responsibility', 'DBT strategy for source/model/test card semantics and operational metrics.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:dbtGraphNodeCardStrategy.ts:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
    'strategy',
    'dvtGraphNodeCardStrategy',
    jsonb_build_object(
      'responsibility', 'DVT strategy for source/transform/sink card semantics and operational metrics.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:dvtGraphNodeCardStrategy.ts:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves strategy-owned status, path, and operational metric semantics.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:graphNodeCardReadModel.test.ts:operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves the card template renders status, path, tags, operational rail, and play affordance.',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('file:GraphNodeCardView.test.tsx:operational-surface:377')
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
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-GRAPH-NODE-CARD-READ-MODEL-OPERATIONAL-SURFACE',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'RenderCanvasGraphNodeOperationalSummary',
    'node-card',
    'Read-model tests prove strategy-owned semantic status, path, and operational rail values for DBT and DVT cards.',
    jsonb_build_object('noPlaceholders', true, 'noInventedMetrics', true),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('evidence:GraphNodeCard:read-model-operational-surface:377')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-GRAPH-NODE-CARD-VIEW-OPERATIONAL-SURFACE',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeCard',
    'node-card',
    'Presentation tests prove the card renders status chip, path, tags, operational rail, and card-local play without calculating semantics.',
    jsonb_build_object('presentationOnly', true),
    'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
    md5('evidence:GraphNodeCard:view-operational-surface:377')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts#GraphNodeCardStatusTone'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts#GraphNodeCardStatus'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts#GraphNodeCardReadModel'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#resolveNodeCardStatus'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#resolveRunStatusLabel'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#pushOperationalMetric'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#resolveRuntimeDurationLabel'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeStatusChipClasses'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx#GraphNodeCardView')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'),
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'),
        ('scripts/planning-db-migrate.test.cjs'),
        ('tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'featureId', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
      'mechanizationStatus', 'implemented',
      'noHumanDecisionsRemaining', true,
      'graphNodeCardOperationalSurface', jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCard',
        'rails', jsonb_build_array(
          'RenderCanvasGraphNodeCard',
          'RenderCanvasGraphNodeOperationalSummary'
        ),
        'noInventedMetrics', true,
        'presentationOnlyTemplate', true
      ),
      'allowedImplementationSurfaces', jsonb_build_array(
        'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
        'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
        'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
        'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts',
        'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
        'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
        'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'scripts/planning-db-migrate.test.cjs',
        'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql'
      ),
      'implementationRefs', jsonb_build_array(
        'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
        'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
        'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
        'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts',
        'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
        'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
        'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'scripts/planning-db-migrate.test.cjs',
        'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql'
      ),
      'symbols', jsonb_build_array(
        jsonb_build_object(
          'name',
          'GraphNodeCardStatusTone',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
          'dddOwner',
          'GraphNodeCard',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'strategy_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeCardStatus',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
          'dddOwner',
          'GraphNodeCard',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'strategy_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'pushOperationalMetric',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner',
          'GraphNodeCard',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'strategy_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'resolveRuntimeDurationLabel',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner',
          'GraphNodeCard',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'strategy_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'resolveRunStatusLabel',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner',
          'GraphNodeCard',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'strategy_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'resolveNodeCardStatus',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner',
          'GraphNodeCard',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'strategy_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        ),
        jsonb_build_object(
          'name',
          'graphNodeStatusChipClasses',
          'path',
          'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
          'dddOwner',
          'GraphNodeStatusChip',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeCard'),
          'fowlerSignals',
          jsonb_build_array('presentation_contract', 'strategy_boundary'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/377_canvas_graph_node_card_operational_surface.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCard:operational-surface:377'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
