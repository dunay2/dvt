-- Feature-mechanization manifests use closed/implemented as terminal statuses.
-- The rail itself remains retired, but the feature manifest must stay closed
-- so implementation checks can read it as completed governance evidence.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{mechanizationStatus}',
    '"closed"'::jsonb,
    true
  ),
  source_path = 'tools/planning-db/migrations/346_normalize_context_menu_echo_repair_retired_manifest_status.sql',
  source_content_sha256 = md5(
    'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1:ResolveCanvasContextMenu:closed-manifest-retired-rail:346'
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1'
  and rail_type = 'query'
  and normalized_rail_name = 'resolvecanvascontextmenu';
