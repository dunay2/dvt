-- Mask the imported historical table query in the SourceImportDialog overlay.
-- The canonical provider-neutral query is ListWarehouseConnectionSourceObjects.

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
  'web.component.canvas.SourceImportDialog',
  'ListWarehouseConnectionTables',
  'query',
  'retired',
  jsonb_build_object(
    'retiredForContextActionCatalog', true,
    'canonicalRail', 'ListWarehouseConnectionSourceObjects',
    'retirementReason', 'Provider-neutral SourceObject discovery replaced table-only vocabulary.'
  ),
  'tools/planning-db/migrations/614_retire_source_import_dialog_table_query_overlay.sql',
  md5('rail:SourceImportDialog:retire-ListWarehouseConnectionTables:614')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
