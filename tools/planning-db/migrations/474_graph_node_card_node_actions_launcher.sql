-- Register the GraphNodeCardView ellipsis button as a governed launcher into
-- the existing CanvasNodeContextMenu. This is an affordance on the card, not a
-- second node-action menu and not a new command/query rail.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLauncher',
      jsonb_build_object(
        'slot', 'graph-node-card-actions',
        'label', 'Más acciones del nodo',
        'icon', 'MoreHorizontal',
        'gesture', 'button click dispatches a bubbling contextmenu event from inside CanvasNodeShell',
        'delegatesToRail', 'ResolveCanvasContextMenu',
        'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
        'hostRail', 'ShowCanvasNodeContextMenu',
        'doesNotRenderParallelNodeActionMenu', true
      )
    ),
  source_path = 'tools/planning-db/migrations/474_graph_node_card_node_actions_launcher.sql',
  source_content_sha256 = md5('file:GraphNodeCardView:node-actions-launcher:474'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLauncherTokens',
      jsonb_build_object(
        'classes', jsonb_build_array('actionsButton', 'actionsIcon'),
        'tokenOwner', 'graphVisualTokens',
        'noInlineStyles', true
      )
    ),
  source_path = 'tools/planning-db/migrations/474_graph_node_card_node_actions_launcher.sql',
  source_content_sha256 = md5('file:graphVisualTokens:node-actions-launcher:474'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLauncherCoverage',
      jsonb_build_object(
        'proves', 'GraphNodeCardView renders graph-node-card-actions and dispatches contextmenu without bubbling a click to the card.',
        'delegatesToRail', 'ResolveCanvasContextMenu',
        'doesNotRenderParallelNodeActionMenu', true
      )
    ),
  source_path = 'tools/planning-db/migrations/474_graph_node_card_node_actions_launcher.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.test:node-actions-launcher:474'),
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
  'EV-CANVAS-GRAPH-NODE-CARD-NODE-ACTIONS-LAUNCHER',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-node-actions',
  'GraphNodeCardView exposes a tokenized ellipsis button that delegates to the existing governed CanvasNodeContextMenu instead of rendering parallel node actions.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected graph-node-card-actions button to exist and dispatch contextmenu, but the card omitted the affordance',
    'slot', 'graph-node-card-actions',
    'delegatesToRail', 'ResolveCanvasContextMenu',
    'hostRail', 'ShowCanvasNodeContextMenu',
    'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
    'doesNotRenderParallelNodeActionMenu', true,
    'commands',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx'
    )
  ),
  'tools/planning-db/migrations/474_graph_node_card_node_actions_launcher.sql',
  md5('evidence:GraphNodeCardView:node-actions-launcher:474')
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
      values ('EV-CANVAS-GRAPH-NODE-CARD-NODE-ACTIONS-LAUNCHER')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsLauncher',
      jsonb_build_object(
        'rail', 'RenderCanvasGraphNodeCard',
        'delegatesToRail', 'ResolveCanvasContextMenu',
        'hostRail', 'ShowCanvasNodeContextMenu',
        'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
        'doesNotOwnNodeMenuActions', true
      )
    ),
  source_path = 'tools/planning-db/migrations/474_graph_node_card_node_actions_launcher.sql',
  source_content_sha256 = md5('component:GraphNodeCardView:node-actions-launcher:474'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView';

with patch as (
  select
    jsonb_build_object(
      'name', 'openGovernedNodeActions',
      'path', 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'dddOwner', 'web.component.canvas.GraphNodeCardView',
      'cqRails', jsonb_build_array(
        'RenderCanvasGraphNodeCard',
        'ResolveCanvasContextMenu',
        'ShowCanvasNodeContextMenu'
      ),
      'fowlerSignals', jsonb_build_array(
        'presentation_event_adapter',
        'delegates_to_existing_node_context_menu',
        'does_not_create_parallel_menu'
      ),
      'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
      'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
      'unitTests', jsonb_build_array(
        'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'
      )
    ) as symbol_manifest,
    jsonb_build_array(
      'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
      'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
      'tools/planning-db/migrations/474_graph_node_card_node_actions_launcher.sql'
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
        select distinct symbol
        from (
        select symbol
        from jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) as symbol
        union all
        select patch.symbol_manifest
        ) merged_symbols(symbol)
      ) distinct_symbols(symbol)
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
          'graphNodeCardNodeActionsLauncher',
          jsonb_build_object(
            'status', 'implemented',
            'componentId', 'web.component.canvas.GraphNodeCardView',
            'rail', 'RenderCanvasGraphNodeCard',
            'delegatesToRail', 'ResolveCanvasContextMenu',
            'hostRail', 'ShowCanvasNodeContextMenu',
            'delegatesToComponentId', 'web.component.canvas.CanvasNodeContextMenu',
            'noParallelNodeActionMenu', true
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
  source_path = 'tools/planning-db/migrations/474_graph_node_card_node_actions_launcher.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardView:node-actions-launcher:474'),
  revision = rail.revision + 1,
  updated_at = now()
from patched_values
where rail.rail_id = patched_values.rail_id;
