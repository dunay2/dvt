-- Keep Canvas node port tones tokenized under the existing
-- RenderCanvasNodePortHandle query rail. This slice moves component-local
-- hex literals into global canvas design tokens without changing behavior.

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
    'apps/web/src/styles/theme.css',
    'design-token',
    null,
    jsonb_build_object(
      'responsibility', 'Own global canvas node port tone tokens consumed by CanvasNodeShell.module.css.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'tokenPrefix', '--canvas-node-port-',
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/403_canvas_node_port_handle_design_tokens.sql',
    md5('file:theme.css:canvas-node-port-design-tokens:403')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'style',
    null,
    jsonb_build_object(
      'responsibility', 'Consume global canvas node port tone tokens and own handle geometry/interaction styles.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'containsComponentLocalHexTones', false,
      'containsInlineBusinessRules', false
    ),
    'tools/planning-db/migrations/403_canvas_node_port_handle_design_tokens.sql',
    md5('file:CanvasNodeShell.module.css:tokenized-port-tones:403')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasNodeShell keeps graph port tone colors in global design tokens instead of component-local hex values.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'guards', jsonb_build_array('no component-local hex tone values', 'required global port tone variables exist')
    ),
    'tools/planning-db/migrations/403_canvas_node_port_handle_design_tokens.sql',
    md5('file:CanvasNodeShell.test.tsx:tokenized-port-tones:403')
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
values (
  'web.component.canvas.GraphNodeCard',
  'EV-CANVAS-NODE-PORT-HANDLE-TOKENIZED-TONES',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
  'RenderCanvasNodePortHandle',
  'node-card',
  'CanvasNodeShell.module.css consumes global canvas node port tone tokens instead of owning hex values.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'CanvasNodeShell.module.css contained component-local hex tone values.',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
  ),
  'tools/planning-db/migrations/403_canvas_node_port_handle_design_tokens.sql',
  md5('evidence:CanvasNodeShell:tokenized-port-tones:403')
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
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/styles/theme.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/403_canvas_node_port_handle_design_tokens.sql'
      )
    ) as refs(value)
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{implementationRefs}',
      (
        select jsonb_agg(distinct value order by value)
        from jsonb_array_elements_text(
          coalesce(raw_manifest->'implementationRefs', '[]'::jsonb)
          || jsonb_build_array(
            'apps/web/src/styles/theme.css',
            'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
            'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
            'tools/planning-db/migrations/403_canvas_node_port_handle_design_tokens.sql'
          )
        ) as refs(value)
      ),
      true
    ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name', '--canvas-node-port-source-ring',
          'path', 'apps/web/src/styles/theme.css',
          'dddOwner', 'CanvasNodePortHandle',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('design_token', 'presentation_boundary'),
          'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
          'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
        ),
        jsonb_build_object(
          'name', '--canvas-node-port-model-ring',
          'path', 'apps/web/src/styles/theme.css',
          'dddOwner', 'CanvasNodePortHandle',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('design_token', 'presentation_boundary'),
          'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
          'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
        ),
        jsonb_build_object(
          'name', '--canvas-node-port-test-ring',
          'path', 'apps/web/src/styles/theme.css',
          'dddOwner', 'CanvasNodePortHandle',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('design_token', 'presentation_boundary'),
          'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
          'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
        ),
        jsonb_build_object(
          'name', '--canvas-node-port-output-ring',
          'path', 'apps/web/src/styles/theme.css',
          'dddOwner', 'CanvasNodePortHandle',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('design_token', 'presentation_boundary'),
          'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
          'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/403_canvas_node_port_handle_design_tokens.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:port-design-tokens:403'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
