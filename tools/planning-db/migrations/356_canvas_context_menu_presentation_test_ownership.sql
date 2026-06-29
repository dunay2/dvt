-- Register the Canvas context-menu presentation test as owned evidence for
-- the passive host template.

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
  'web.component.canvas.CanvasContextMenu',
  'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
  'presentation-test',
  null,
  jsonb_build_object(
    'responsibility', 'Proves the passive context-menu template renders root and catalog sections from view models without owning command decisions.',
    'coversComponents', jsonb_build_array(
      'web.component.canvas.CanvasContextMenu',
      'web.component.canvas.CanvasBackgroundContextMenu'
    )
  ),
  'tools/planning-db/migrations/356_canvas_context_menu_presentation_test_ownership.sql',
  md5('file:CanvasContextMenuView.test:356')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
