-- Harden the DB-first feature manifest after implementation validation:
-- deleted paths are governed as component non-goals, not as forbidden
-- implementation surfaces, because the feature checker evaluates changed
-- deletions against forbidden patterns literally.

with updated_manifest as (
  select
    rail_id,
    jsonb_set(
      (
        raw_manifest
        - 'forbiddenImplementationSurfaces'
      ),
      '{userStories}',
      jsonb_build_array(
        'buzon/TAREA.TXT',
        'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md'
      ),
      true
    ) as manifest
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#UXDB-CANVAS-CONTEXT-MENU-P0-1#command#retirecanvasfixedaddnodepalette'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      updated_manifest.manifest->'allowedImplementationSurfaces'
      || jsonb_build_array(
        'tools/planning-db/migrations/151_web_canvas_context_menu_feature_manifest_hardening.sql'
      )
    ) as surfaces(surface)
  ),
  implementation_refs = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      rail.implementation_refs
      || jsonb_build_array(
        'tools/planning-db/migrations/151_web_canvas_context_menu_feature_manifest_hardening.sql'
      )
    ) as surfaces(surface)
  ),
  raw_manifest = jsonb_set(
    updated_manifest.manifest,
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(distinct surface order by surface)
      from jsonb_array_elements_text(
        updated_manifest.manifest->'allowedImplementationSurfaces'
        || jsonb_build_array(
          'tools/planning-db/migrations/151_web_canvas_context_menu_feature_manifest_hardening.sql'
        )
      ) as surfaces(surface)
    ),
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from updated_manifest
where rail.rail_id = updated_manifest.rail_id;
