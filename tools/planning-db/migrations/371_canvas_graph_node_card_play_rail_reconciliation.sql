-- Reconcile the node-card Play affordance with the existing
-- RenderCanvasGraphNodeCard rail instead of creating a duplicate rail.

delete from planning_query_store.feature_mechanization_local_rails
where rail_id = 'local#CANVAS-GRAPH-NODE-CARD-PLAY-20260629#query#rendercanvasgraphnodecard';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx#GraphNodeCardView'),
        ('apps/web/src/app/plugins/graph/graphNodeCardActions.ts#BuildGraphNodeCardPlayActionArgs'),
        ('apps/web/src/app/plugins/graph/graphNodeCardActions.ts#GraphNodeCardPlayAction'),
        ('apps/web/src/app/plugins/graph/graphNodeCardActions.ts#buildGraphNodeCardPlayAction'),
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx#GraphNodeRenderer'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx#DbtNodeRenderer')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/graphNodeCardActions.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.test.tsx'),
        ('tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql'),
        ('tools/planning-db/migrations/371_canvas_graph_node_card_play_rail_reconciliation.sql')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardActions.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.test.tsx'),
        ('tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql'),
        ('tools/planning-db/migrations/371_canvas_graph_node_card_play_rail_reconciliation.sql')
    ) surfaces(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardActions.test.ts'),
        ('pnpm --filter @dvt/web test:presentation:run -- src/app/plugins/graph/GraphNodeCardView.test.tsx src/app/plugins/dbt/DbtNodeRenderer.test.tsx'),
        ('pnpm docs:feature-mechanization:implementation')
    ) guards(value)
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardActions.test.ts'),
        ('pnpm --filter @dvt/web test:presentation:run -- src/app/plugins/graph/GraphNodeCardView.test.tsx src/app/plugins/dbt/DbtNodeRenderer.test.tsx'),
        ('pnpm docs:feature-mechanization:implementation')
    ) gates(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'nodeCardPlayAffordance', jsonb_build_object(
        'status', 'implemented',
        'usesExistingCommand', 'ToggleCanvasExecutionSelection',
        'doesNotStartRun', true,
        'rationale', 'The node-card Play affordance selects or deselects the node for execution until a governed run-from-node rail exists.'
      ),
      'allowedImplementationSurfaces',
      (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          values
            ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
            ('apps/web/src/app/plugins/graph/graphNodeCardActions.ts'),
            ('apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts'),
            ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
            ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
            ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
            ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.test.tsx'),
            ('tools/planning-db/migrations/370_canvas_graph_node_card_play_action.sql'),
            ('tools/planning-db/migrations/371_canvas_graph_node_card_play_rail_reconciliation.sql')
        ) surfaces(value)
      ),
      'symbols',
      (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) as symbol_refs(value)
          union all
          select jsonb_build_object(
            'name', 'BuildGraphNodeCardPlayActionArgs',
            'path', 'apps/web/src/app/plugins/graph/graphNodeCardActions.ts',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('read_model_input_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'covered by component presentation test before browser toolbar iteration',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'GraphNodeCardPlayAction',
            'path', 'apps/web/src/app/plugins/graph/graphNodeCardActions.ts',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('read_model_action_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'covered by component presentation test before browser toolbar iteration',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'buildGraphNodeCardPlayAction',
            'path', 'apps/web/src/app/plugins/graph/graphNodeCardActions.ts',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('execution_selection_reuse', 'no_fake_run_command'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'covered by component presentation test before browser toolbar iteration',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'GraphNodeCardView',
            'path', 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('presentation_template', 'node_local_action_slot'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'covered by component presentation test before browser toolbar iteration',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'GraphNodeRenderer',
            'path', 'apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx',
            'dddOwner', 'GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('shared_renderer_projection'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'covered by component presentation test before browser toolbar iteration',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'DbtNodeRenderer',
            'path', 'apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx',
            'dddOwner', 'DbtNodeCard',
            'cqRails', jsonb_build_array('RenderDbtCanvasNodeCard', 'RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('strategy_renderer_reuses_shared_card_action'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'covered by component presentation test before browser toolbar iteration',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/dbt/DbtNodeRenderer.test.tsx')
          )
        ) symbols(value)
      )
    ),
  source_path = 'tools/planning-db/migrations/371_canvas_graph_node_card_play_rail_reconciliation.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardPlayAffordance:371'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
