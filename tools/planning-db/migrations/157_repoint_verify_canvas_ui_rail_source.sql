-- Repoint the DB-local VerifyCanvasUiRail gap rail away from a missing
-- migration filename. The rail remains a visible gap from the F-29-C plan, but
-- the old nonfunctional source path is explicitly deprecated instead of being
-- left as source drift.

update planning_query_store.feature_mechanization_local_rails rail
set
  source_path = 'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md'
    ),
    rail.source_content_sha256
  ),
  documentation_refs = (
    select coalesce(jsonb_agg(distinct source_ref.value order by source_ref.value), '[]'::jsonb)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.documentation_refs, '[]'::jsonb)) existing_ref(value)
      union all
      select 'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md'
    ) source_ref
  ),
  governing_sources = (
    select coalesce(jsonb_agg(distinct source_ref.value order by source_ref.value), '[]'::jsonb)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.governing_sources, '[]'::jsonb)) existing_ref(value)
      union all
      select 'docs/architecture/command-query-rail-governance.md'
      union all
      select 'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md'
    ) source_ref
  ),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'deprecatedSourcePath',
    'tools/planning-db/migrations/150_web_canvas_context_menu_retirement_feature_mechanization.sql',
    'sourcePath',
    'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md',
    'sourceRepointReason',
    'The old migration path was never a tracked source file. VerifyCanvasUiRail is declared by the F-29-C Canvas Insert Palette plan and remains a gap rail until implemented or retired.',
    'sourcePathReconciledBy',
    '157_repoint_verify_canvas_ui_rail_source'
  ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'deprecatedSourcePath',
    'tools/planning-db/migrations/150_web_canvas_context_menu_retirement_feature_mechanization.sql',
    'sourcePath',
    'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md',
    'sourceRepointReason',
    'The old migration path was never a tracked source file. The F-29-C plan is the governing source for VerifyCanvasUiRail.',
    'reconciledBy',
    '157_repoint_verify_canvas_ui_rail_source'
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
where rail.source_path = 'tools/planning-db/migrations/150_web_canvas_context_menu_retirement_feature_mechanization.sql'
  and rail.normalized_rail_name = 'verifycanvasuirail'
  and rail.rail_type = 'query';
