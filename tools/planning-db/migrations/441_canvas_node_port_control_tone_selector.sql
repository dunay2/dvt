-- Record the explicit control-tone selector for Canvas node port handles.
-- CanvasNodeShell owns the CSS host file; CanvasNodePortHandle owns the
-- RenderCanvasNodePortHandle query rail that consumes the tone.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'portControlToneSelector',
      jsonb_build_object(
        'selector', '.portHandle[data-tone=''control'']',
        'ringToken', '--canvas-node-port-control-ring',
        'fillToken', '--canvas-node-port-control-fill',
        'rail', 'RenderCanvasNodePortHandle'
      )
    ),
  source_path = 'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql',
  source_content_sha256 = md5('file:CanvasNodeShell.module.css:port-control-tone:441'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeShell'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.module.css';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'portControlToneCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'assertsSelector', '.portHandle[data-tone=''control'']',
        'assertsGlobalToken', '--canvas-node-port-control-ring'
      )
    ),
  source_path = 'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql',
  source_content_sha256 = md5('file:CanvasNodeShell.test.tsx:port-control-tone:441'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeShell'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'explicitControlToneSelector',
      true,
      'controlToneOwner', 'CanvasNodeShell.module.css',
      'controlToneSelector', '.portHandle[data-tone=''control'']',
      'controlToneTokens', jsonb_build_array(
        '--canvas-node-port-control-ring',
        '--canvas-node-port-control-fill'
      )
    ),
  source_path = 'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql',
  source_content_sha256 = md5('rail:CanvasNodePortHandle:control-tone-selector:441'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodePortHandle'
  and rail_name = 'RenderCanvasNodePortHandle';

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
  'web.component.canvas.CanvasNodeShell',
  'EV-CANVAS-NODE-PORT-CONTROL-TONE-SELECTOR',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
  'RenderCanvasNodePortHandle',
  'canvas-node-port-handle-control-tone',
  'CanvasNodeShell CSS explicitly maps data-tone=control to the global Canvas node port control tokens used by CanvasNodePortHandle.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
    'selector', '.portHandle[data-tone=''control'']',
    'ringToken', '--canvas-node-port-control-ring',
    'fillToken', '--canvas-node-port-control-fill',
    'noLocalHex', true
  ),
  'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql',
  md5('evidence:CanvasNodeShell:port-control-tone-selector:441')
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
      values ('EV-CANVAS-NODE-PORT-CONTROL-TONE-SELECTOR')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'portControlToneSelector',
      jsonb_build_object(
        'selector', '.portHandle[data-tone=''control'']',
        'rail', 'RenderCanvasNodePortHandle',
        'tokenized', true
      )
    ),
  source_path = 'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql',
  source_content_sha256 = md5('component:CanvasNodeShell:port-control-tone-selector:441'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeShell';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'canvasNodePortControlToneSelector',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.CanvasNodeShell',
        'rail', 'RenderCanvasNodePortHandle',
        'selector', '.portHandle[data-tone=''control'']',
        'tokens', jsonb_build_array(
          '--canvas-node-port-control-ring',
          '--canvas-node-port-control-fill'
        )
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql'
      )
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql'
      )
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/441_canvas_node_port_control_tone_selector.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:port-control-tone-selector:441'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
