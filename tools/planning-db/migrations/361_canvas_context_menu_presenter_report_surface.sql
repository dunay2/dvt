-- Register the Canvas context-menu presenter report as an allowed DB-first
-- documentation/evidence surface for the active presenter SRP feature manifest.

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(
        implementation_refs || jsonb_build_array(
          'docs/superpowers/plans/2026-06-28-canvas-context-menu-presenter-informe.md'
        )
      ) as refs(value)
    ) as unique_refs
  ),
  documentation_refs = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(
        documentation_refs || jsonb_build_array(
          'docs/superpowers/plans/2026-06-28-canvas-context-menu-presenter-informe.md'
        )
      ) as refs(value)
    ) as unique_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(
        allowed_implementation_surfaces || jsonb_build_array(
          'docs/superpowers/plans/2026-06-28-canvas-context-menu-presenter-informe.md',
          'tools/planning-db/migrations/361_canvas_context_menu_presenter_report_surface.sql'
        )
      ) as refs(value)
    ) as unique_refs
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      raw_manifest,
      '{allowedImplementationSurfaces}',
      (
        select jsonb_agg(value order by value)
        from (
          select distinct value
          from jsonb_array_elements_text(
            coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
            || jsonb_build_array(
              'docs/superpowers/plans/2026-06-28-canvas-context-menu-presenter-informe.md',
              'tools/planning-db/migrations/361_canvas_context_menu_presenter_report_surface.sql'
            )
          ) as refs(value)
        ) as unique_refs
      ),
      true
    ),
    '{componentGuides}',
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements_text(
          coalesce(raw_manifest->'componentGuides', '[]'::jsonb)
          || jsonb_build_array(
            'docs/superpowers/plans/2026-06-28-canvas-context-menu-presenter-informe.md'
          )
        ) as refs(value)
      ) as unique_refs
    ),
    true
  ),
  source_content_sha256 = md5(
    'CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628:report-surface:361'
  ),
  revision = greatest(revision, 2),
  updated_at = now()
where rail_id = 'local#CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628#query#resolvecanvascontextmenu';
