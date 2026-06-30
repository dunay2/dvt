-- Move NodeFloatingToolbar visual class policy out of the TSX template and
-- into a component-owned token module. This updates the existing
-- RenderCanvasNodeFloatingToolbar rail; no new product command/query is added.

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
  'web.component.canvas.NodeFloatingToolbar',
  'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts',
  'style-tokens',
  'canvasNodeFloatingToolbarClasses',
  jsonb_build_object(
    'responsibility', 'Own NodeFloatingToolbar visual class tokens and action-state class resolution outside the TSX template.',
    'rail', 'RenderCanvasNodeFloatingToolbar',
    'presentationOnly', true,
    'replaces', jsonb_build_array('CanvasNodeFloatingToolbarView.tsx#getActionClassName')
  ),
  'tools/planning-db/migrations/394_canvas_node_floating_toolbar_visual_tokens.sql',
  md5('file:canvasNodeFloatingToolbarTokens:394')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = raw_file || jsonb_build_object(
    'tokenConsumer', 'canvasNodeFloatingToolbarTokens',
    'doesNotOwnVisualClassPolicy', true
  ),
  source_path = 'tools/planning-db/migrations/394_canvas_node_floating_toolbar_visual_tokens.sql',
  source_content_sha256 = md5('file:CanvasNodeFloatingToolbarView:token-consumer:394'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx';

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
  'web.component.canvas.NodeFloatingToolbar',
  'EV-CANVAS-NODE-FLOATING-TOOLBAR-TOKENIZED-VIEW',
  'presentation-test',
  'current',
  'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx',
  'RenderCanvasNodeFloatingToolbar',
  'node-left-click',
  'CanvasNodeFloatingToolbarView exposes token scope and action state while delegating visual class policy to canvasNodeFloatingToolbarTokens.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected data-token-scope and data-action-state values but received null attributes',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'
  ),
  'tools/planning-db/migrations/394_canvas_node_floating_toolbar_visual_tokens.sql',
  md5('evidence:NodeFloatingToolbar:tokenized-view:394')
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
      where value <> 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx#getActionClassName'
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts#canvasNodeFloatingToolbarClasses'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts#CanvasNodeFloatingToolbarActionState'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts#resolveCanvasNodeFloatingToolbarActionState'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts#resolveCanvasNodeFloatingToolbarActionClassName')
    ) updated_refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts'),
        ('tools/planning-db/migrations/394_canvas_node_floating_toolbar_visual_tokens.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts'),
        ('tools/planning-db/migrations/394_canvas_node_floating_toolbar_visual_tokens.sql')
    ) updated_refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'nodeFloatingToolbarVisualTokens',
        jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.NodeFloatingToolbar',
          'rail', 'RenderCanvasNodeFloatingToolbar',
          'tokenFile', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts',
          'retiredViewSymbol', 'CanvasNodeFloatingToolbarView.tsx#getActionClassName'
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
          where value->>'name' <> 'getActionClassName'
          union all
          select jsonb_build_object(
            'name', 'canvasNodeFloatingToolbarClasses',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('presentation_token_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:presentation_token_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarActionState',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('semantic_state_contract'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:type_alias',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'resolveCanvasNodeFloatingToolbarActionClassName',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('presentation_token_resolver'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:presentation_token_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'resolveCanvasNodeFloatingToolbarActionState',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('semantic_state_projection'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:presentation_token_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx')
          )
        ) raw_symbols(value)
      ) distinct_symbols(value)
    )
  ),
  source_path = 'tools/planning-db/migrations/394_canvas_node_floating_toolbar_visual_tokens.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:394'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
