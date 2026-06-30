-- Mark the Canvas context-menu presenter SRP feature manifest as non-canonical
-- for rail vocabulary purposes. Migration 359 declares symbols and allowed
-- surfaces for feature mechanization; the canonical ResolveCanvasContextMenu
-- rail already exists and must remain the only active vocabulary row.

update planning_query_store.feature_mechanization_local_rails
set
  rail_status = 'retired',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'status', 'manifest-only-reuses-existing-rail',
    'canonicalRail', 'ResolveCanvasContextMenu',
    'canonicalRailOwner', 'web.component.canvas.CanvasContextMenuPresenter'
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'railVocabularyState', 'manifest-only-reuses-existing-rail',
    'canonicalRail', 'ResolveCanvasContextMenu'
  ),
  source_path = 'tools/planning-db/migrations/360_canvas_context_menu_presenter_srp_manifest_vocabulary_state.sql',
  source_content_sha256 = md5('CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628:manifest-only-vocabulary:360'),
  updated_at = now()
where rail_id =
  'local#CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628#query#resolvecanvascontextmenu';
