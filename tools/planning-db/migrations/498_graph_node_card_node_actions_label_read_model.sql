-- Move GraphNodeCardView node-actions copy into the supplied card read model.
-- The ellipsis button still delegates to the existing CanvasNodeContextMenu;
-- this only records the copy contract so the presentation view does not own
-- hardcoded UI text.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLabelReadModel',
      jsonb_build_object(
        'field', 'GraphNodeCardReadModel.nodeActionsLabel',
        'responsibility', 'Define the accessible label/title supplied to the graph-node-card-actions launcher.',
        'suppliedCopyContract', true,
        'rail', 'RenderCanvasGraphNodeCard'
      )
    ),
  source_path = 'tools/planning-db/migrations/498_graph_node_card_node_actions_label_read_model.sql',
  source_content_sha256 = md5('file:graphNodeCardStrategyContracts:nodeActionsLabel:498'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLabelProjection',
      jsonb_build_object(
        'field', 'GraphNodeCardReadModel.nodeActionsLabel',
        'label', 'Más acciones del nodo',
        'suppliedCopyContract', true,
        'rail', 'RenderCanvasGraphNodeCard'
      )
    ),
  source_path = 'tools/planning-db/migrations/498_graph_node_card_node_actions_label_read_model.sql',
  source_content_sha256 = md5('file:graphNodeCardStrategies:nodeActionsLabel:498'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path in (
    'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts',
    'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'
  );

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLauncherCopy',
      jsonb_build_object(
        'field', 'GraphNodeCardReadModel.nodeActionsLabel',
        'slot', 'graph-node-card-actions',
        'suppliedCopyContract', true,
        'noHardcodedCopy', true
      )
    ),
  source_path = 'tools/planning-db/migrations/498_graph_node_card_node_actions_label_read_model.sql',
  source_content_sha256 = md5('file:GraphNodeCardView:nodeActionsLabel:498'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLauncherCopyCoverage',
      jsonb_build_object(
        'proves', 'GraphNodeCardView uses GraphNodeCardReadModel.nodeActionsLabel for graph-node-card-actions aria-label and title.',
        'suppliedCopyContract', true
      )
    ),
  source_path = 'tools/planning-db/migrations/498_graph_node_card_node_actions_label_read_model.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.test:nodeActionsLabel:498'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx';

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
  'EV-CANVAS-GRAPH-NODE-CARD-NODE-ACTIONS-LABEL-READ-MODEL',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-node-actions-label-read-model',
  'GraphNodeCardView renders graph-node-card-actions copy from GraphNodeCardReadModel.nodeActionsLabel instead of hardcoded view text.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected Open node menu, received hardcoded Más acciones del nodo',
    'slot', 'graph-node-card-actions',
    'field', 'GraphNodeCardReadModel.nodeActionsLabel',
    'suppliedCopyContract', true,
    'commands',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts'
    )
  ),
  'tools/planning-db/migrations/498_graph_node_card_node_actions_label_read_model.sql',
  md5('evidence:GraphNodeCardView:nodeActionsLabelReadModel:498')
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

with patch as (
  select
    jsonb_build_object(
      'name', 'GraphNodeCardReadModel.nodeActionsLabel',
      'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
      'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
      'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
      'fowlerSignals', jsonb_build_array(
        'supplied_copy_contract',
        'presentation_view_no_hardcoded_copy',
        'delegates_to_existing_node_context_menu'
      ),
      'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
      'cypressCoverage', 'not_applicable: internal GraphNodeCard accessible-label projection covered by presentation tests; no new browser workflow behavior',
      'unitTests', jsonb_build_array(
        'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
      )
    ) as symbol_manifest,
    jsonb_build_array(
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
      'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'tools/planning-db/migrations/498_graph_node_card_node_actions_label_read_model.sql'
    ) as touched_surfaces
),
target_rail as (
  select
    rail_id,
    raw_manifest,
    implementation_refs,
    allowed_implementation_surfaces
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
    and rail_name = 'RenderCanvasGraphNodeCard'
),
patched_values as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(symbol order by symbol->>'path', symbol->>'name')
      from (
        select symbol
        from jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) as symbol
        where not (
          symbol->>'name' = patch.symbol_manifest->>'name'
          and symbol->>'path' = patch.symbol_manifest->>'path'
        )
        union all
        select patch.symbol_manifest
      ) merged_symbols(symbol)
    ) as symbols,
    (
      select jsonb_agg(distinct value order by value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(target_rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)) existing_manifest(value)
        union all
        select value
        from jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)) existing_column(value)
        union all
        select value
        from jsonb_array_elements_text(patch.touched_surfaces) touched(value)
      ) merged_surfaces(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(target_rail.implementation_refs, '[]'::jsonb)) existing_refs(value)
        union all
        select value
        from jsonb_array_elements_text(patch.touched_surfaces) touched(value)
      ) merged_refs(value)
    ) as implementation_refs
  from target_rail
  cross join patch
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb)
        || jsonb_build_object(
          'graphNodeCardNodeActionsLabelReadModel',
          jsonb_build_object(
            'status', 'implemented',
            'componentId', 'web.component.canvas.GraphNodeCardView',
            'strategyComponentId', 'web.component.canvas.GraphNodeCardStrategy',
            'rail', 'RenderCanvasGraphNodeCard',
            'field', 'GraphNodeCardReadModel.nodeActionsLabel',
            'suppliedCopyContract', true
          )
        ),
      '{symbols}',
      coalesce(patched_values.symbols, '[]'::jsonb),
      true
    ),
    '{allowedImplementationSurfaces}',
    coalesce(patched_values.allowed_surfaces, '[]'::jsonb),
    true
  ),
  implementation_refs = coalesce(patched_values.implementation_refs, '[]'::jsonb),
  allowed_implementation_surfaces = coalesce(patched_values.allowed_surfaces, '[]'::jsonb),
  source_path = 'tools/planning-db/migrations/498_graph_node_card_node_actions_label_read_model.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardView:node-actions-label-read-model:498'),
  revision = rail.revision + 1,
  updated_at = now()
from patched_values
where rail.rail_id = patched_values.rail_id;
