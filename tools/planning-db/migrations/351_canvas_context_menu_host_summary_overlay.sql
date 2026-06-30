-- Correct the imported CanvasContextMenu aggregate summary after the context-action
-- catalog split. The imported markdown row remains as bootstrap history, but the
-- effective DB-first component summary must describe the host responsibility.

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
  'web.component.canvas.CanvasContextMenu',
  'CanvasContextMenuHost',
  'context-panel',
  'current',
  'extract',
  'Canvas workbench',
  'Hosts the positioned Canvas context-menu template and delegates valid action ownership to context-specific child components.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'dbFirst', true,
    'fowlerSignal', 'responsibility_overload',
    'architecturalRole', 'host',
    'childComponents', jsonb_build_array(
      'web.component.canvas.CanvasBackgroundContextMenu',
      'web.component.canvas.CanvasEdgeContextMenu',
      'web.component.canvas.CanvasNodeContextMenu',
      'web.component.canvas.CanvasSelectionContextMenu'
    ),
    'supersededSummaryListsRetired', jsonb_build_array(
      'plugin_scope',
      'capability_gaps',
      'evidence_refs'
    )
  ),
  'tools/planning-db/migrations/351_canvas_context_menu_host_summary_overlay.sql',
  md5('web.component.canvas.CanvasContextMenu:host-summary-overlay:351')
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
