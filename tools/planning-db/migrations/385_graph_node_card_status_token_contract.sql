-- Record the GraphNodeCard visual contract cleanup: the textual status chip is
-- the card status indicator, and interaction state classes are owned by graph
-- visual tokens rather than ad hoc template strings.

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
    'EV-CANVAS-GRAPH-NODE-CARD-SINGLE-STATUS-INDICATOR',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeCard',
    'node-card',
    'GraphNodeCardView renders one textual status chip and does not render a second anonymous status dot.',
    jsonb_build_object(
      'statusChipOnly', true,
      'anonymousStatusDot', false,
      'tokenizedInteractionState', true,
      'tokenizedTemplateChrome', true,
      'tokenOwner', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts'
    ),
    'tools/planning-db/migrations/385_graph_node_card_status_token_contract.sql',
    md5('evidence:GraphNodeCard:single-status-indicator:385')
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
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/385_graph_node_card_status_token_contract.sql')
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
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/385_graph_node_card_status_token_contract.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardSingleStatusIndicator',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCard',
        'rail', 'RenderCanvasGraphNodeCard',
        'statusIndicator', 'GraphNodeStatusChip',
        'anonymousStatusDotRemoved', true,
        'interactionStateTokens', jsonb_build_array(
          'nodeCardSelected',
          'nodeCardHovered',
          'nodeCardDimmed'
        ),
        'templateChromeTokens', jsonb_build_array(
          'nodeCardIcon',
          'nodeCardHeaderActions',
          'nodeCardPlayIcon',
          'columnsToggleLabel',
          'columnsToggleIcon',
          'columnsList'
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/385_graph_node_card_status_token_contract.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardSingleStatusIndicator:385'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
