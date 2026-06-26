-- Normalize the already-applied Canvas node context-menu primitive manifest to
-- the feature-mechanization version contract. Feature manifests use version 1;
-- changes are represented by rail revision, not by bumping raw_manifest.version.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'manifestVersionNormalization', 'Feature manifest version remains 1; rail revision records DB-first evolution.',
      'allowedImplementationSurfaces', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)) current_refs(value)
          union all
          select 'tools/planning-db/migrations/306_canvas_node_context_menu_primitives_manifest_version_normalization.sql'
        ) next_refs
      )
    ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) current_refs(value)
      union all
      select 'tools/planning-db/migrations/306_canvas_node_context_menu_primitives_manifest_version_normalization.sql'
    ) next_refs
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) current_refs(value)
      union all
      select 'tools/planning-db/migrations/306_canvas_node_context_menu_primitives_manifest_version_normalization.sql'
    ) next_refs
  ),
  source_path = 'tools/planning-db/migrations/306_canvas_node_context_menu_primitives_manifest_version_normalization.sql',
  source_content_sha256 = md5('DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619:manifest-version-normalization:306'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619'
  and rail_name = 'ResolveCanvasContextMenu';
