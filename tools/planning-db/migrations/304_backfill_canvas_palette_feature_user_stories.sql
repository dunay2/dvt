-- Backfill user stories for the DB-authored Canvas palette retirement rail.
-- Migration 303 was applied locally before the implementation gate required
-- userStories, so this preserves migration immutability and normalizes the
-- effective feature manifest through a new migration.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'userStories', jsonb_build_array(
        'As a Canvas maintainer, I need the component registry drift read model to distinguish visual palette tokens from retired fixed add-node palette UI so DB-first architecture work is routed to the correct component owner.',
        'As a reviewer, I need CanvasAddNodePalette.tsx to remain the explicit legacy insertion sentinel so a fixed add-node palette cannot return without a drift finding.'
      ),
      'visualPaletteTokenPath', 'apps/web/src/app/views/canvas/canvasPalette.ts',
      'legacyAddNodePaletteSentinelPath', 'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx'
    ),
  source_path = 'tools/planning-db/migrations/304_backfill_canvas_palette_feature_user_stories.sql',
  source_content_sha256 = md5('E-CANVAS-LEGACY-PALETTE-RETIRE-1:userStories:304'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-LEGACY-PALETTE-RETIRE-1'
  and rail_name = 'ClassifyCanvasPaletteSurface';

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
  'web.component.canvas.CanvasComponentRegistryDriftGuard',
  'tools/planning-db/migrations/304_backfill_canvas_palette_feature_user_stories.sql',
  'migration',
  'canvas_palette_feature_user_stories_backfill',
  jsonb_build_object(
    'role', 'Planning DB migration that normalizes Canvas palette retirement user stories after local rail import',
    'featureId', 'E-CANVAS-LEGACY-PALETTE-RETIRE-1'
  ),
  'tools/planning-db/migrations/304_backfill_canvas_palette_feature_user_stories.sql',
  md5('canvas-palette-feature-user-stories-backfill:304')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
