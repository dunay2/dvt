-- Retire the legacy PreviewExecutablePlan alias from the Canvas frontend
-- component inventory. UXDB already owns PreviewExecutionPlan as the canonical
-- execution preview rail; component and creation-intent queries must not keep
-- advertising the older executable-plan vocabulary.

delete from planning_query_store.frontend_component_cq_rails
where component_id = 'web.component.canvas.CanvasContextMenu'
  and rail_name = 'PreviewExecutablePlan';

delete from planning_query_store.frontend_component_local_cq_rails
where component_id = 'web.component.canvas.CanvasContextMenu'
  and rail_name = 'PreviewExecutablePlan';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasContextMenu',
  'PreviewExecutionPlan',
  'command',
  'implemented-api',
  jsonb_build_object(
    'featureId', 'E-CANVAS-UX-DBFIRST-MAP-1',
    'legacyRailName', 'PreviewExecutablePlan',
    'canonicalRailName', 'PreviewExecutionPlan',
    'reason', 'Canvas execution preview vocabulary is canonicalized in UXDB and component inventory.'
  ),
  'tools/planning-db/migrations/339_canvas_frontend_execution_preview_rail_alias_retirement.sql',
  md5('web.component.canvas.CanvasContextMenu:PreviewExecutionPlan:E-CANVAS-UX-DBFIRST-MAP-1:339')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.command_query_rails
where rail_name = 'PreviewExecutablePlan'
  and normalized_rail_name = 'previewexecutableplan'
  and source_path = 'docs/architecture/components/web/frontend-component-inventory.md';
