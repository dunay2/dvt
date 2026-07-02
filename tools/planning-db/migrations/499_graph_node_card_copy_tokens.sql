-- Register GraphNodeCard shared copy tokens for strategy-owned read-model projection.
-- The strategies consume these tokens while the visible card view renders the
-- supplied GraphNodeCardReadModel copy; no new command/query rail is introduced.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeCardStrategy',
  'apps/web/src/app/plugins/graph/graphNodeCardCopyTokens.ts',
  'copy-token',
  'graphNodeCardCopyTokens.nodeActionsLabel',
  jsonb_build_object(
    'responsibility', 'Provide shared visible GraphNodeCard copy consumed by graph-node-card read-model strategies.',
    'rail', 'RenderCanvasGraphNodeCard',
    'sharedCopyToken', true,
    'copyOwner', 'web.component.canvas.GraphNodeCardStrategy',
    'token', 'graphNodeCardCopyTokens.nodeActionsLabel',
    'preventsDrift', 'Default, DBT, and DVT graph card strategies use one node-actions label token.'
  ),
  'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql',
  md5('file:graphNodeCardCopyTokens:nodeActionsLabel:499')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nodeActionsSharedCopyToken',
      jsonb_build_object(
        'field', 'GraphNodeCardReadModel.nodeActionsLabel',
        'token', 'graphNodeCardCopyTokens.nodeActionsLabel',
        'sharedCopyToken', true,
        'rail', 'RenderCanvasGraphNodeCard',
        'noStrategyLiteralCopy', true
      )
    ),
  source_path = 'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql',
  source_content_sha256 = md5('file:graphNodeCardStrategies:copy-token:499'),
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
      'copyTokenArchitectureGuard',
      jsonb_build_object(
        'proves', 'GraphNodeCard strategies consume graphNodeCardCopyTokens.nodeActionsLabel instead of visible copy literals.',
        'sharedCopyToken', true,
        'rail', 'RenderCanvasGraphNodeCard'
      )
    ),
  source_path = 'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql',
  source_content_sha256 = md5('file:graphNodeCardReadModel.architecture.test:copy-token:499'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts';

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
  'web.component.canvas.GraphNodeCardStrategy',
  'EV-CANVAS-GRAPH-NODE-CARD-COPY-TOKENS',
  'architecture-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-copy-tokens',
  'GraphNodeCard strategies consume graphNodeCardCopyTokens.nodeActionsLabel instead of repeating visible node-actions copy.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'graphNodeCardCopyTokens.ts must exist: expected false to be true',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
    'featureMechanizationCommand', 'pnpm docs:feature-mechanization:implementation',
    'token', 'graphNodeCardCopyTokens.nodeActionsLabel',
    'sharedCopyToken', true,
    'cypressCoverage', 'not_applicable: internal GraphNodeCard read-model copy token covered by architecture and unit tests; no new browser workflow behavior'
  ),
  'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql',
  md5('evidence:GraphNodeCardStrategy:copy-tokens:499')
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
      values ('EV-CANVAS-GRAPH-NODE-CARD-COPY-TOKENS')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'copyTokens',
      jsonb_build_object(
        'rail', 'RenderCanvasGraphNodeCard',
        'tokenFile', 'apps/web/src/app/plugins/graph/graphNodeCardCopyTokens.ts',
        'token', 'graphNodeCardCopyTokens.nodeActionsLabel',
        'sharedCopyToken', true,
        'strategyLiteralCopyRemoved', true
      )
    ),
  source_path = 'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql',
  source_content_sha256 = md5('component:GraphNodeCardStrategy:copy-tokens:499'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy';

with patch as (
  select
    jsonb_build_object(
      'name', 'graphNodeCardCopyTokens.nodeActionsLabel',
      'path', 'apps/web/src/app/plugins/graph/graphNodeCardCopyTokens.ts',
      'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
      'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
      'fowlerSignals', jsonb_build_array(
        'shared_copy_token',
        'strategy_literal_copy_removed',
        'graph_card_read_model_supplies_copy'
      ),
      'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
      'cypressCoverage', 'not_applicable: internal GraphNodeCard read-model copy token covered by architecture and unit tests; no new browser workflow behavior',
      'unitTests', jsonb_build_array(
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
      )
    ) as symbol_manifest,
    jsonb_build_array(
      'apps/web/src/app/plugins/graph/graphNodeCardCopyTokens.ts',
      'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
      'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql'
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
          'graphNodeCardCopyTokens',
          jsonb_build_object(
            'status', 'implemented',
            'componentId', 'web.component.canvas.GraphNodeCardStrategy',
            'rail', 'RenderCanvasGraphNodeCard',
            'token', 'graphNodeCardCopyTokens.nodeActionsLabel',
            'sharedCopyToken', true,
            'strategyLiteralCopyRemoved', true
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
  source_path = 'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardStrategy:copy-tokens:499'),
  revision = rail.revision + 1,
  updated_at = now()
from patched_values
where rail.rail_id = patched_values.rail_id;

with patch as (
  select jsonb_build_object(
    'name', 'graphNodeCardCopyTokens',
    'path', 'apps/web/src/app/plugins/graph/graphNodeCardCopyTokens.ts',
    'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
    'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
    'fowlerSignals', jsonb_build_array(
      'shared_copy_token_catalog',
      'strategy_literal_copy_removed',
      'component_owned_copy_source'
    ),
    'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
    'cypressCoverage', 'not_applicable: internal GraphNodeCard read-model copy token covered by architecture and unit tests; no new browser workflow behavior',
    'unitTests', jsonb_build_array(
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
    )
  ) as symbol_manifest
),
target_rail as (
  select rail_id, raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
    and rail_name = 'RenderCanvasGraphNodeCard'
),
patched_symbols as (
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
    ) as symbols
  from target_rail
  cross join patch
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeCardCopyTokenObject',
        jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.GraphNodeCardStrategy',
          'rail', 'RenderCanvasGraphNodeCard',
          'symbol', 'graphNodeCardCopyTokens',
          'sharedCopyToken', true
        )
      ),
    '{symbols}',
    coalesce(patched_symbols.symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/499_graph_node_card_copy_tokens.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardStrategy:copy-token-object:499'),
  revision = rail.revision + 1,
  updated_at = now()
from patched_symbols
where rail.rail_id = patched_symbols.rail_id;
