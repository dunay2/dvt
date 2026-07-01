-- Record the GraphNodeOperationalRail native button activation contract.
-- The rail is rendered as a button; keyboard activation is therefore owned by
-- native button semantics, not by a parallel keydown handler that can double
-- open the health popover.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nativeKeyboardActivation',
      jsonb_build_object(
        'rail', 'RenderCanvasGraphNodeOperationalSummary',
        'buttonOwnsKeyboardActivation', true,
        'customKeydownOpener', false,
        'preventsDuplicateOpen', true
      )
    ),
  source_path = 'tools/planning-db/migrations/464_graph_node_operational_rail_native_keyboard_activation.sql',
  source_content_sha256 = md5('file:GraphNodeOperationalRail.tsx:native-keyboard-activation:464'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'nativeKeyboardActivationCoverage',
      jsonb_build_object(
        'rail', 'RenderCanvasGraphNodeOperationalSummary',
        'presentationTest', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
        'proves', 'one native keyboard button activation opens operational details once'
      )
    ),
  source_path = 'tools/planning-db/migrations/464_graph_node_operational_rail_native_keyboard_activation.sql',
  source_content_sha256 = md5('file:GraphNodeOperationalRail.test.tsx:native-keyboard-activation:464'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx';

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
  'web.component.canvas.GraphNodeOperationalRail',
  'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-NATIVE-KEYBOARD-ACTIVATION',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
  'RenderCanvasGraphNodeOperationalSummary',
  'graph-node-operational-rail',
  'GraphNodeOperationalRail relies on native button keyboard activation and does not double-open operational details from keydown plus click.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
    'buttonOwnsKeyboardActivation', true,
    'customKeydownOpener', false,
    'preventsDuplicateOpen', true
  ),
  'tools/planning-db/migrations/464_graph_node_operational_rail_native_keyboard_activation.sql',
  md5('evidence:GraphNodeOperationalRail:native-keyboard-activation:464')
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
      values ('EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-NATIVE-KEYBOARD-ACTIVATION')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'nativeKeyboardActivation',
      jsonb_build_object(
        'rail', 'RenderCanvasGraphNodeOperationalSummary',
        'buttonOwnsKeyboardActivation', true,
        'preventsDuplicateOpen', true
      )
    ),
  source_path = 'tools/planning-db/migrations/464_graph_node_operational_rail_native_keyboard_activation.sql',
  source_content_sha256 = md5('component:GraphNodeOperationalRail:native-keyboard-activation:464'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/464_graph_node_operational_rail_native_keyboard_activation.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'),
        ('tools/planning-db/migrations/464_graph_node_operational_rail_native_keyboard_activation.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeOperationalRailNativeKeyboardActivation',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeOperationalRail',
        'rail', 'RenderCanvasGraphNodeOperationalSummary',
        'preventsDuplicateOpen', true
      )
    ),
  source_path = 'tools/planning-db/migrations/464_graph_node_operational_rail_native_keyboard_activation.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeOperationalRail:native-keyboard-activation:464'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeOperationalSummary';
