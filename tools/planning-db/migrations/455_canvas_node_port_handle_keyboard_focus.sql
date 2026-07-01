-- Record the keyboard-focus affordance for Canvas node port handles.
-- Compatibility hints already render on focus-visible; the handle must be
-- focusable so keyboard users can reach the same connection guidance.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'keyboardFocusAffordance',
    jsonb_build_object(
      'tabIndex', 0,
      'hintRelationship', 'aria-describedby points to the rendered compatibility hint when present.',
      'doesNotOwnEdgeAdmission', true
    )
  ),
  source_path = 'tools/planning-db/migrations/455_canvas_node_port_handle_keyboard_focus.sql',
  source_content_sha256 = md5('file:CanvasNodePortHandle:keyboard-focus:455'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodePortHandle'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx'
  and file_role = 'presentation';

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
  'web.component.canvas.CanvasNodePortHandle',
  'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
  'presentation-test',
  null,
  jsonb_build_object(
    'coverage', 'Direct CanvasNodePortHandle tests assert stable port data, compatibility hint copy, aria-describedby, and keyboard focusability.',
    'rail', 'RenderCanvasNodePortHandle',
    'keyboardFocusAffordance', true
  ),
  'tools/planning-db/migrations/455_canvas_node_port_handle_keyboard_focus.sql',
  md5('file:CanvasNodePortHandle.test:keyboard-focus:455')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'keyboardFocusAffordance',
    'CanvasNodePortHandle is focusable so focus-visible compatibility hints are reachable by keyboard.'
  ),
  source_path = 'tools/planning-db/migrations/455_canvas_node_port_handle_keyboard_focus.sql',
  source_content_sha256 = md5('rail:CanvasNodePortHandle:keyboard-focus:455'),
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
  'web.component.canvas.CanvasNodePortHandle',
  'EV-CANVAS-NODE-PORT-HANDLE-KEYBOARD-FOCUS-HINT',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
  'RenderCanvasNodePortHandle',
  'node-port-handle',
  'CanvasNodePortHandle exposes compatibility hints through aria-describedby and is keyboard focusable with tabIndex=0.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected null to be 0 for tabindex',
    'tabIndex', 0,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodePortHandle.test.tsx'
  ),
  'tools/planning-db/migrations/455_canvas_node_port_handle_keyboard_focus.sql',
  md5('evidence:CanvasNodePortHandle:keyboard-focus:455')
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
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'canvasNodePortHandleKeyboardFocus',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.CanvasNodePortHandle',
        'rail', 'RenderCanvasNodePortHandle',
        'tabIndex', 0,
        'ariaDescribedByHint', true,
        'doesNotOwnEdgeAdmission', true
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
        'tools/planning-db/migrations/455_canvas_node_port_handle_keyboard_focus.sql'
      )
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
        'tools/planning-db/migrations/455_canvas_node_port_handle_keyboard_focus.sql'
      )
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/455_canvas_node_port_handle_keyboard_focus.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodePortHandle:keyboard-focus:455'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
