update planning_query_store.db_governance_surfaces
set
  migration_state = 'DB-first',
  source_ref = 'tools/planning-db/migrations/060_component_definition_surface_db_first.sql',
  source_content_sha256 = repeat('0', 64),
  revision = revision + 1,
  updated_by = 'migration',
  updated_at = now(),
  raw_surface = jsonb_set(
    coalesce(raw_surface, '{}'::jsonb),
    '{authority}',
    '"db"'::jsonb,
    true
  )
where surface_name = 'Governance component definition';
