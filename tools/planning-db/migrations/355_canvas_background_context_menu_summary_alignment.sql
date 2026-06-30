-- Align the Canvas background context-menu component summary with the
-- DB-first spatial root contract introduced by migration 354.

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
  'web.component.canvas.CanvasBackgroundContextMenu',
  'CanvasBackgroundContextMenu',
  'context-panel',
  'current',
  'extract',
  'Canvas workbench',
  'Owns valid actions for right-clicking Canvas background space with spatial coordinates, independent of whether the graph has nodes.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'parentComponentId', 'web.component.canvas.CanvasContextMenu',
    'contextId', 'canvas-background',
    'spatial', true,
    'emptyCanvasOnly', false,
    'backgroundRootActions', jsonb_build_array('Add...', 'Canvas settings'),
    'rootRails', jsonb_build_array('OpenCanvasAddNodeCatalog', 'OpenCanvasSettings'),
    'addNodeCatalogComponentId', 'web.component.canvas.CanvasAddNodeCatalog',
    'settingsComponentId', 'web.component.canvas.CanvasSettings'
  ),
  'tools/planning-db/migrations/355_canvas_background_context_menu_summary_alignment.sql',
  md5('web.component.canvas.CanvasBackgroundContextMenu:spatial-root-summary:355')
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
