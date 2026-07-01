-- Record that GraphNodeCard owns human-readable port compatibility labels.
-- Edge admission remains governed by AuthorCanvasGraphEdge; this slice only
-- changes the passive presentation text exposed through Canvas node ports.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityLabels',
      jsonb_build_object(
        'rail', 'RenderCanvasGraphNodeCard',
        'presenter', 'buildCanvasConnectionCompatibilityByNodeId',
        'labelSource', 'buildGraphNodeTitlePresentation',
        'doesNotOwnEdgeAdmission', true,
        'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
      )
    ),
  source_path = 'tools/planning-db/migrations/449_graph_node_card_port_compatibility_human_labels.sql',
  source_content_sha256 = md5('file:canvasConnectionCompatibilityPresenter:human-labels:449'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityHumanLabelCoverage',
      jsonb_build_object(
        'assertsSourcePortLabel', 'Orders Model',
        'assertsTargetPortLabel', 'Postgres · public',
        'technicalIdFallbackRejected', true
      )
    ),
  source_path = 'tools/planning-db/migrations/449_graph_node_card_port_compatibility_human_labels.sql',
  source_content_sha256 = md5('file:canvasConnectionCompatibilityPresenter.test:human-labels:449'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts';

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
  'web.component.canvas.GraphNodeCard',
  'EV-CANVAS-GRAPH-NODE-CARD-PORT-COMPATIBILITY-HUMAN-LABELS',
  'unit-test',
  'current',
  'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
  'RenderCanvasGraphNodeCard',
  'canvas-connection-compatibility-presenter',
  'GraphNodeCard compatibility hints present compatible node labels with the same human title projection used by card read models.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
    'sourcePortCompatibleLabel', 'Orders Model',
    'targetPortCompatibleLabel', 'Postgres · public',
    'labelPresenter', 'buildGraphNodeTitlePresentation',
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
  ),
  'tools/planning-db/migrations/449_graph_node_card_port_compatibility_human_labels.sql',
  md5('evidence:GraphNodeCard:port-compatibility-human-labels:449')
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
      values ('EV-CANVAS-GRAPH-NODE-CARD-PORT-COMPATIBILITY-HUMAN-LABELS')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityLabels',
      jsonb_build_object(
        'labelPresenter', 'buildGraphNodeTitlePresentation',
        'compatibleLabelExamples', jsonb_build_array('Orders Model', 'Postgres · public'),
        'edgeAdmissionRail', 'AuthorCanvasGraphEdge',
        'doesNotOwnEdgeAdmission', true
      )
    ),
  source_path = 'tools/planning-db/migrations/449_graph_node_card_port_compatibility_human_labels.sql',
  source_content_sha256 = md5('component:GraphNodeCard:port-compatibility-human-labels:449'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts'),
        ('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('tools/planning-db/migrations/449_graph_node_card_port_compatibility_human_labels.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts'),
        ('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('tools/planning-db/migrations/449_graph_node_card_port_compatibility_human_labels.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardPortCompatibilityHumanLabels',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCard',
        'rail', 'RenderCanvasGraphNodeCard',
        'labelPresenter', 'buildGraphNodeTitlePresentation',
        'doesNotOwnEdgeAdmission', true,
        'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
      )
    ),
  source_path = 'tools/planning-db/migrations/449_graph_node_card_port_compatibility_human_labels.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCard:port-compatibility-human-labels:449'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
