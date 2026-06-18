-- Feature mechanization requires a non-empty forbidden surface list. The real
-- retired file prohibitions are component non-goals; this sentinel documents
-- that no additional feature-level path pattern is applicable.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    raw_manifest,
    '{forbiddenImplementationSurfaces}',
    jsonb_build_array('not_applicable:retired_paths_governed_by_component_non_goals'),
    true
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      allowed_implementation_surfaces
      || jsonb_build_array(
        'tools/planning-db/migrations/153_web_canvas_context_menu_feature_forbidden_surface_sentinel.sql'
      )
    ) as surfaces(surface)
  ),
  implementation_refs = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      implementation_refs
      || jsonb_build_array(
        'tools/planning-db/migrations/153_web_canvas_context_menu_feature_forbidden_surface_sentinel.sql'
      )
    ) as surfaces(surface)
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#UXDB-CANVAS-CONTEXT-MENU-P0-1#command#retirecanvasfixedaddnodepalette';
