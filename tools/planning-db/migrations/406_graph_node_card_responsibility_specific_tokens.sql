-- Replace the GraphNodeCard catch-all graphVisualClasses DB contract with
-- responsibility-specific token groups. This keeps the existing
-- RenderCanvasGraphNodeCard rail; no new product behavior is introduced.

update planning_query_store.frontend_component_local_files
set
  exported_symbol = 'graphNodeCardSurfaceClasses;graphNodeCardLayoutClasses;graphNodeMetricRowClasses;graphNodeTagListClasses;graphNodeOperationalRailClasses;graphNodeHealthPopoverClasses;fallbackGraphNodeClasses;graphNodeColumnClasses;graphNodeStatusChipClasses',
  raw_file = jsonb_build_object(
    'responsibility', 'Own responsibility-specific graph-node presentation token groups for GraphNodeCard rendering.',
    'rail', 'RenderCanvasGraphNodeCard',
    'presentationOnly', true,
    'retiredSymbols', jsonb_build_array('graphVisualClasses'),
    'tokenGroups', jsonb_build_array(
      'graphNodeCardSurfaceClasses',
      'graphNodeCardLayoutClasses',
      'graphNodeMetricRowClasses',
      'graphNodeTagListClasses',
      'graphNodeOperationalRailClasses',
      'graphNodeHealthPopoverClasses',
      'fallbackGraphNodeClasses',
      'graphNodeColumnClasses',
      'graphNodeStatusChipClasses'
    )
  ),
  source_path = 'tools/planning-db/migrations/406_graph_node_card_responsibility_specific_tokens.sql',
  source_content_sha256 = md5('file:graphVisualTokens:responsibility-specific-token-groups:406'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts'
  and file_role = 'style-token';

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
  'EV-CANVAS-GRAPH-NODE-CARD-RESPONSIBILITY-SPECIFIC-TOKENS',
  'architecture-test',
  'current',
  'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
  'RenderCanvasGraphNodeCard',
  'node-card-presentation-tokens',
  'GraphNodeCard presentation components consume responsibility-specific token groups rather than the retired graphVisualClasses catch-all.',
  jsonb_build_object(
    'redGreen', true,
    'retiredSymbol', 'graphVisualClasses',
    'requiredGroups', jsonb_build_array(
      'graphNodeCardSurfaceClasses',
      'graphNodeCardLayoutClasses',
      'graphNodeMetricRowClasses',
      'graphNodeTagListClasses',
      'graphNodeOperationalRailClasses',
      'graphNodeHealthPopoverClasses',
      'fallbackGraphNodeClasses'
    ),
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'
  ),
  'tools/planning-db/migrations/406_graph_node_card_responsibility_specific_tokens.sql',
  md5('evidence:GraphNodeCard:responsibility-specific-tokens:406')
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
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      where value <> 'apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphVisualClasses'
      union all
      values
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeCardSurfaceClasses'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeCardLayoutClasses'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeMetricRowClasses'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeTagListClasses'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeOperationalRailClasses'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeHealthPopoverClasses'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#fallbackGraphNodeClasses'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeColumnClasses')
    ) updated_refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx'),
        ('apps/web/src/app/plugins/FallbackNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'),
        ('docs/architecture/components/web/graph/react-flow-visual-token-component.md'),
        ('tools/planning-db/migrations/406_graph_node_card_responsibility_specific_tokens.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeStatusChip.tsx'),
        ('apps/web/src/app/plugins/FallbackNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'),
        ('docs/architecture/components/web/graph/react-flow-visual-token-component.md'),
        ('tools/planning-db/migrations/406_graph_node_card_responsibility_specific_tokens.sql')
    ) updated_refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeCardResponsibilitySpecificTokens',
        jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.GraphNodeCard',
          'rail', 'RenderCanvasGraphNodeCard',
          'retiredSymbol', 'graphVisualClasses'
        )
      ),
    '{symbols}',
    (
      select jsonb_agg(value order by value::text)
      from (
        select distinct value
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) symbols(value)
          where value->>'name' <> 'graphVisualClasses'
          union all
          select jsonb_build_object(
            'name', symbol_name,
            'path', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('presentation_token_group', 'single_responsibility'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:presentation_token_group',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'
            )
          )
          from (
            values
              ('graphNodeCardSurfaceClasses'),
              ('graphNodeCardLayoutClasses'),
              ('graphNodeMetricRowClasses'),
              ('graphNodeTagListClasses'),
              ('graphNodeOperationalRailClasses'),
              ('graphNodeHealthPopoverClasses'),
              ('fallbackGraphNodeClasses'),
              ('graphNodeColumnClasses')
          ) token_symbols(symbol_name)
        ) raw_symbols(value)
      ) distinct_symbols(value)
    )
  ),
  source_path = 'tools/planning-db/migrations/406_graph_node_card_responsibility_specific_tokens.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCard:responsibility-specific-tokens:406'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
