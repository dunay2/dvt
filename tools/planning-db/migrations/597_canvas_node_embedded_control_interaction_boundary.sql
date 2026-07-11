-- Model the shared DOM interaction boundary used by controls embedded inside
-- graph nodes. The policy prevents control activation from also being treated
-- as a node-body selection while preserving explicit selection of another node.

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status
)
values
  (
    'web.component.canvas.CanvasViewport',
    'CanvasViewport',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'CanvasViewportProps',
    'typescript',
    'high',
    'implemented'
  ),
  (
    'web.component.canvas.CanvasNodePortHandle',
    'CanvasNodePortHandle',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
    'CanvasNodePortHandle',
    'typescript',
    'high',
    'implemented'
  ),
  (
    'web.component.canvas.CanvasNodeInteractionBoundary',
    'CanvasNodeInteractionBoundary',
    'module',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts',
    'canvasNodeEmbeddedControlProps;isCanvasNodeEmbeddedControlTarget',
    'typescript',
    'high',
    'implemented'
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  updated_at = now();

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'web.component.canvas.CanvasNodeInteractionBoundary',
  'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts',
  repeat('0', 64),
  0,
  'Canvas node interaction boundary',
  'component',
  'SYS-WEB-CANVAS-GRAPH-SURFACE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Own the shared marker and target policy that distinguish embedded node controls from node-body selection.',
  'CanvasNodeInteractionPolicy',
  'RenderCanvasContextualGraphSurface;OpenCanvasNodeHealthPopover',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  parent_id = excluded.parent_id,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'web.component.canvas.CanvasNodeInteractionBoundary',
  'owns',
  'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts',
  0
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('web.component.canvas.CanvasNodeInteractionBoundary', 'responsibility', 'Mark and recognize controls embedded inside a graph node.', 0),
  ('web.component.canvas.CanvasNodeInteractionBoundary', 'non_goal', 'Does not select nodes, open popovers, render controls, or execute graph commands.', 0),
  ('web.component.canvas.CanvasNodeInteractionBoundary', 'reason_to_change', 'The host protocol for distinguishing node controls from node-body interactions changes.', 0),
  ('web.component.canvas.CanvasNodeInteractionBoundary', 'public_api', 'canvasNodeEmbeddedControlProps; isCanvasNodeEmbeddedControlTarget', 0),
  ('web.component.canvas.CanvasNodeInteractionBoundary', 'invariant', 'Activating an embedded control cannot also activate the node-body selection rail.', 0),
  ('web.component.canvas.CanvasNodeInteractionBoundary', 'fowler_signal', 'Separated Presentation interaction policy', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  raw_component,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasNodeInteractionBoundary',
  'CanvasNodeInteractionBoundary',
  'query-view',
  'current',
  'extract',
  'Frontend / Canvas',
  'Define the shared presentation boundary between embedded node controls and CanvasViewport node-body selection.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-CANVAS-NODE-INTERACTION-BOUNDARY-SELECTION'),
  jsonb_build_object(
    'dbFirst', true,
    'architecturalRole', 'interaction-policy',
    'visualComponent', false,
    'presentationOnly', true,
    'governingRails', jsonb_build_array(
      'RenderCanvasContextualGraphSurface',
      'OpenCanvasNodeHealthPopover'
    ),
    'consumers', jsonb_build_array(
      'web.component.canvas.CanvasViewport',
      'web.component.canvas.GraphNodeCardView',
      'web.component.canvas.GraphNodeOperationalRail',
      'web.component.canvas.GraphNodeColumnSection',
      'web.component.canvas.GraphNodeMetricHotspot',
      'web.component.canvas.CanvasNodePortHandle'
    )
  ),
  'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
  md5('component:CanvasNodeInteractionBoundary:597')
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
  'web.component.canvas.CanvasNodeInteractionBoundary',
  'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts',
  'interaction-policy',
  'isCanvasNodeEmbeddedControlTarget',
  jsonb_build_object(
    'responsibility', 'Expose one canonical marker and target predicate for embedded graph-node controls.',
    'rails', jsonb_build_array('RenderCanvasContextualGraphSurface', 'OpenCanvasNodeHealthPopover'),
    'noBusinessLogic', true
  ),
  'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
  md5('file:canvasNodeInteractionBoundary:597')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodeInteractionBoundary',
    'RenderCanvasContextualGraphSurface',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'reuseExistingRail', true,
      'role', 'classify event targets before the viewport delegates node-body interaction',
      'negativeTests', jsonb_build_array(
        'embedded controls do not open the node floating toolbar',
        'node-body clicks remain selectable'
      )
    ),
    'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
    md5('rail:CanvasNodeInteractionBoundary:RenderCanvasContextualGraphSurface:597')
  ),
  (
    'web.component.canvas.CanvasNodeInteractionBoundary',
    'OpenCanvasNodeHealthPopover',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'reuseExistingRail', true,
      'role', 'keep operational-detail activation independent from node selection',
      'negativeTests', jsonb_build_array(
        'a transient empty React Flow selection does not close the newly opened popover',
        'selecting a different node closes the popover'
      )
    ),
    'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
    md5('rail:CanvasNodeInteractionBoundary:OpenCanvasNodeHealthPopover:597')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  ('REL-GRAPH-SURFACE-CONTAINS-CANVAS-VIEWPORT', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'web.component.canvas.CanvasViewport', 'contains', 'outbound', 'sync', null, 'CanvasViewport has no normalized architecture parent', 'canvas_presentation', jsonb_build_array('apps/web/src/app/views/canvas/CanvasViewport.tsx'), 'implemented'),
  ('REL-GRAPH-SURFACE-CONTAINS-CANVAS-NODE-PORT', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'web.component.canvas.CanvasNodePortHandle', 'contains', 'outbound', 'sync', null, 'CanvasNodePortHandle has no normalized architecture parent', 'canvas_presentation', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx'), 'implemented'),
  ('REL-GRAPH-SURFACE-CONTAINS-NODE-INTERACTION-BOUNDARY', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'web.component.canvas.CanvasNodeInteractionBoundary', 'contains', 'outbound', 'sync', null, 'embedded node-control selection semantics have no owner', 'canvas_presentation', jsonb_build_array('apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts'), 'implemented'),
  ('REL-CANVAS-VIEWPORT-USES-NODE-INTERACTION-BOUNDARY', 'web.component.canvas.CanvasViewport', 'web.component.canvas.CanvasNodeInteractionBoundary', 'depends_on', 'outbound', 'sync', null, 'control clicks also trigger node-body selection', 'canvas_presentation', jsonb_build_array('apps/web/src/app/views/canvas/CanvasViewport.tsx'), 'implemented'),
  ('REL-GRAPH-CARD-USES-NODE-INTERACTION-BOUNDARY', 'web.component.canvas.GraphNodeCardView', 'web.component.canvas.CanvasNodeInteractionBoundary', 'depends_on', 'outbound', 'sync', null, 'card actions bubble into node-body selection', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'), 'implemented'),
  ('REL-GRAPH-OPERATIONAL-RAIL-USES-NODE-INTERACTION-BOUNDARY', 'web.component.canvas.GraphNodeOperationalRail', 'web.component.canvas.CanvasNodeInteractionBoundary', 'depends_on', 'outbound', 'sync', null, 'health activation is immediately replaced by node selection', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'), 'implemented'),
  ('REL-GRAPH-COLUMN-SECTION-USES-NODE-INTERACTION-BOUNDARY', 'web.component.canvas.GraphNodeColumnSection', 'web.component.canvas.CanvasNodeInteractionBoundary', 'depends_on', 'outbound', 'sync', null, 'column disclosure also selects the node', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx'), 'implemented'),
  ('REL-GRAPH-METRIC-HOTSPOT-USES-NODE-INTERACTION-BOUNDARY', 'web.component.canvas.GraphNodeMetricHotspot', 'web.component.canvas.CanvasNodeInteractionBoundary', 'depends_on', 'outbound', 'sync', null, 'metric detail focus also selects the node', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx'), 'implemented'),
  ('REL-CANVAS-NODE-PORT-USES-NODE-INTERACTION-BOUNDARY', 'web.component.canvas.CanvasNodePortHandle', 'web.component.canvas.CanvasNodeInteractionBoundary', 'depends_on', 'outbound', 'sync', null, 'port interaction also activates node-body selection', 'canvas_presentation', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx'), 'implemented')
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
values (
  'PORT-CANVAS-NODE-INTERACTION-TARGET-CLASSIFY',
  'web.component.canvas.CanvasNodeInteractionBoundary',
  'RenderCanvasContextualGraphSurface',
  'query',
  'inbound',
  null,
  null,
  array[
    'embedded controls must not activate node-body selection',
    'empty selection emitted by an embedded control must not close its popover'
  ]::text[],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-CANVAS-NODE-INTERACTION-BOUNDARY-SELECTION',
  'web.component.canvas.CanvasNodeInteractionBoundary',
  'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
  'integration',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

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
values
  (
    'web.component.canvas.CanvasNodeInteractionBoundary',
    'EV-CANVAS-NODE-INTERACTION-BOUNDARY-SELECTION',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
    'RenderCanvasContextualGraphSurface',
    'canvas-node-embedded-control-selection-boundary',
    'Embedded controls do not invoke node-body selection and a transient empty selection does not close the surface they opened.',
    jsonb_build_object(
      'redGreenProven', true,
      'emptySelectionPreservesPopover', true,
      'differentNodeSelectionClosesPopover', true,
      'duplicateTestAdded', false
    ),
    'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
    md5('evidence:CanvasNodeInteractionBoundary:selection:597')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'EV-CANVAS-VIEWPORT-EMBEDDED-CONTROL-SELECTION-BOUNDARY',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
    'OpenCanvasNodeHealthPopover',
    'canvas-viewport-node-surface-host',
    'CanvasViewport preserves a just-opened node health popover across the empty selection emitted by its embedded control.',
    jsonb_build_object(
      'policyComponentId', 'web.component.canvas.CanvasNodeInteractionBoundary',
      'nodeBodySelectionSuppressed', true,
      'emptySelectionIgnored', true,
      'otherNodeSelectionCloses', true
    ),
    'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
    md5('evidence:CanvasViewport:embedded-control-selection:597')
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
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'embeddedControlInteractionBoundary', 'web.component.canvas.CanvasNodeInteractionBoundary',
    'emptySelectionAfterControlActivation', 'preserve-open-surface'
  ),
  source_path = 'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
  source_content_sha256 = md5('component:CanvasViewport:embedded-control-selection:597'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasViewport';

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'embeddedControlInteractionBoundary', 'web.component.canvas.CanvasNodeInteractionBoundary',
    'transientEmptySelectionClosesPopover', false
  ),
  source_path = 'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
  source_content_sha256 = md5('component:GraphNodeHealthPopover:embedded-control-selection:597'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'emptySelectionPreservesPopover', true,
    'differentNodeSelectionClosesPopover', true,
    'interactionBoundaryComponentId', 'web.component.canvas.CanvasNodeInteractionBoundary'
  ),
  source_path = 'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
  source_content_sha256 = md5('file:CanvasViewport.nodeOperationalRail:embedded-control-selection:597'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasViewport'
  and file_path = 'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx';

update planning_query_store.feature_mechanization_local_rails rails
set
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts',
          'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'
        )
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{embeddedNodeControlBoundary}',
    jsonb_build_object(
      'componentId', 'web.component.canvas.CanvasNodeInteractionBoundary',
      'emptySelectionPreservesOpenedSurface', true,
      'differentNodeSelectionClosesOpenedSurface', true,
      'noParallelRail', true
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/597_canvas_node_embedded_control_interaction_boundary.sql',
  source_content_sha256 = md5(rails.rail_name || ':embedded-node-control-boundary:597'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_name in ('RenderCanvasContextualGraphSurface', 'OpenCanvasNodeHealthPopover');

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
