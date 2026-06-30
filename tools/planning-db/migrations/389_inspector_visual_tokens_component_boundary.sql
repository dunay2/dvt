-- Keep Inspector/workbench visual tokens out of the React Flow graph token
-- component. The slice has no new product command; it supports the existing
-- InspectCanvasNodeProperties query rail as a presentation boundary.

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
values
  (
    'web.component.canvas.InspectorVisualTokens',
    'InspectorVisualTokens',
    'state-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Own Inspector and node workbench visual tokens without leaking them into React Flow graph rendering tokens.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    jsonb_build_array('apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'),
    jsonb_build_object(
      'dbFirst', true,
      'presentationOnly', true,
      'semanticOwner', 'Inspector and node workbench presentation',
      'separatesFromComponentId', 'web.component.canvas.GraphNodeCard',
      'governingRail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
    md5('web.component.canvas.InspectorVisualTokens:389')
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
values
  (
    'web.component.canvas.InspectorVisualTokens',
    'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
    'tokens',
    'inspectorVisualClasses; inspectorStatusDotClasses',
    jsonb_build_object(
      'responsibility', 'Expose Inspector and node workbench visual class tokens.',
      'presentationOnly', true,
      'mustNotOwnGraphNodeCardTokens', true,
      'governingRail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
    md5('file:inspectorVisualTokens.ts:389')
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
    'web.component.canvas.InspectorVisualTokens',
    'InspectCanvasNodeProperties',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'presentationSupportOnly', true,
      'doesNotCreateNewBehavior', true,
      'consumerComponents', jsonb_build_array(
        'web.component.canvas.CanvasNodeWorkbenchPanel',
        'web.component.canvas.NodeWorkbench'
      )
    ),
    'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
    md5('rail:InspectorVisualTokens:InspectCanvasNodeProperties:389')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
values
  (
    'web.component.canvas.InspectorVisualTokens',
    'EV-CANVAS-INSPECTOR-VISUAL-TOKENS-BOUNDARY',
    'architecture-test',
    'current',
    'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
    'InspectCanvasNodeProperties',
    'canvas-node-workbench',
    'Inspector/workbench visual tokens are owned outside graphVisualTokens and consumers do not import graph inspector aliases.',
    jsonb_build_object(
      'graphTokenFile', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
      'inspectorTokenFile', 'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
      'preventsGraphTokenChurn', true
    ),
    'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
    md5('evidence:InspectorVisualTokens:boundary:389')
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
