-- Register the Canvas node port compatibility visual hint. CanvasNodeShell owns
-- the CSS host selector; CanvasNodePortHandle owns the RenderCanvasNodePortHandle
-- presentation rail and does not decide edge admission.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityHintSelector',
      jsonb_build_object(
        'selector', '.portCompatibilityHint',
        'triggerSelector', '.portHandle:hover + .portCompatibilityHint',
        'rail', 'RenderCanvasNodePortHandle',
        'usesGlobalTokens', true,
        'noLocalHex', true
      )
    ),
  source_path = 'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql',
  source_content_sha256 = md5('file:CanvasNodeShell.module.css:port-compatibility-hint:451'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeShell'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.module.css';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityHintPresenter',
      jsonb_build_object(
        'rail', 'RenderCanvasNodePortHandle',
        'helper', 'resolveCompatibilityHintText',
        'rendersSlot', 'canvas-node-port-compatibility-hint',
        'linksWithAriaDescribedBy', true,
        'doesNotOwnEdgeAdmission', true,
        'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
      )
    ),
  source_path = 'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql',
  source_content_sha256 = md5('file:CanvasNodePortHandle.tsx:port-compatibility-hint:451'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodePortHandle'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityHintCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
        'assertsSlot', 'canvas-node-port-compatibility-hint',
        'assertsHumanCompatibleLabels', jsonb_build_array('Orders Model', 'Snapshot 1'),
        'assertsAriaDescribedBy', true
      )
    ),
  source_path = 'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql',
  source_content_sha256 = md5('file:CanvasNodePortHandle.test.tsx:port-compatibility-hint:451'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodePortHandle'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityVisualHint',
      jsonb_build_object(
        'slot', 'canvas-node-port-compatibility-hint',
        'helper', 'resolveCompatibilityHintText',
        'ariaDescribedBy', true,
        'cssHostComponentId', 'web.component.canvas.CanvasNodeShell',
        'doesNotOwnEdgeAdmission', true,
        'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
      )
    ),
  source_path = 'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql',
  source_content_sha256 = md5('rail:CanvasNodePortHandle:port-compatibility-hint:451'),
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
  'EV-CANVAS-NODE-PORT-COMPATIBILITY-HINT',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
  'RenderCanvasNodePortHandle',
  'canvas-node-port-compatibility-hint',
  'CanvasNodePortHandle renders human compatible node labels as an accessible visual hint without deciding edge admission.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodePortHandle.test.tsx',
    'slot', 'canvas-node-port-compatibility-hint',
    'assertedLabels', jsonb_build_array('Orders Model', 'Snapshot 1'),
    'ariaDescribedBy', true,
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
  ),
  'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql',
  md5('evidence:CanvasNodePortHandle:port-compatibility-hint:451')
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
      values ('EV-CANVAS-NODE-PORT-COMPATIBILITY-HINT')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'portCompatibilityHint',
      jsonb_build_object(
        'slot', 'canvas-node-port-compatibility-hint',
        'rail', 'RenderCanvasNodePortHandle',
        'cssHostComponentId', 'web.component.canvas.CanvasNodeShell',
        'doesNotOwnEdgeAdmission', true
      )
    ),
  source_path = 'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql',
  source_content_sha256 = md5('component:CanvasNodePortHandle:port-compatibility-hint:451'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodePortHandle';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'canvasNodePortCompatibilityHint',
        jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.CanvasNodePortHandle',
          'cssHostComponentId', 'web.component.canvas.CanvasNodeShell',
          'rail', 'RenderCanvasNodePortHandle',
          'slot', 'canvas-node-port-compatibility-hint',
          'doesNotOwnEdgeAdmission', true,
          'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
        )
      ),
    '{symbols}',
    (
      select jsonb_agg(value order by value->>'name')
      from (
        select distinct on (value->>'name', value->>'path') value
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) existing(value)
          where value->>'name' <> 'resolveCompatibilityHintText'
          union all
          select jsonb_build_object(
            'name', 'resolveCompatibilityHintText',
            'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
            'dddOwner', 'web.component.canvas.CanvasNodePortHandle',
            'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
            'fowlerSignals', jsonb_build_array(
              'passive_presentation_hint',
              'accessible_compatibility_projection',
              'does_not_own_edge_admission'
            ),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx'
            )
          )
        ) all_symbols(value)
      ) distinct_symbols
    ),
    true
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql'
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
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql'
      )
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/451_canvas_node_port_compatibility_hint.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodePortHandle:port-compatibility-hint:451'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
