-- The feature-mechanization checker requires the field to exist. This slice
-- keeps concrete retired path prohibitions in component non-goals, so the
-- feature-level forbidden surface set is intentionally empty.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    raw_manifest,
    '{forbiddenImplementationSurfaces}',
    '[]'::jsonb,
    true
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      allowed_implementation_surfaces
      || jsonb_build_array(
        'tools/planning-db/migrations/152_web_canvas_context_menu_feature_forbidden_surface_empty_set.sql'
      )
    ) as surfaces(surface)
  ),
  implementation_refs = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      implementation_refs
      || jsonb_build_array(
        'tools/planning-db/migrations/152_web_canvas_context_menu_feature_forbidden_surface_empty_set.sql'
      )
    ) as surfaces(surface)
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#UXDB-CANVAS-CONTEXT-MENU-P0-1#command#retirecanvasfixedaddnodepalette';
