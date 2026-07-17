-- Align the migration ordinal feature with the mandatory Fowler planning
-- governance source without mutating its already-applied mechanization row.

update planning_query_store.feature_mechanization_local_rails
set
  documentation_refs = documentation_refs || jsonb_build_array(
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  governing_sources = governing_sources || jsonb_build_array(
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  implementation_refs = implementation_refs || jsonb_build_array(
    'tools/planning-db/migrations/724_planning_db_migration_ordinal_governance_alignment.sql'
  ),
  allowed_implementation_surfaces = allowed_implementation_surfaces || jsonb_build_array(
    'tools/planning-db/migrations/724_planning_db_migration_ordinal_governance_alignment.sql'
  ),
  source_path = 'tools/planning-db/migrations/724_planning_db_migration_ordinal_governance_alignment.sql',
  source_content_sha256 = md5(
    'A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1:PreparePlanningDbForCiGate:724'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      raw_manifest,
      '{governingSources}',
      coalesce(raw_manifest->'governingSources', '[]'::jsonb) || jsonb_build_array(
        'docs/architecture/fowler-opportunity-planning-governance.md'
      ),
      true
    ),
    '{allowedImplementationSurfaces}',
    coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb) || jsonb_build_array(
      'tools/planning-db/migrations/724_planning_db_migration_ordinal_governance_alignment.sql'
    ),
    true
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1#command#prepareplanningdbforcigate';

do $$
begin
  if not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where rail_id = 'local#A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1#command#prepareplanningdbforcigate'
  ) then
    raise exception
      'Migration ordinal mechanization rail must exist before governance alignment';
  end if;
end
$$;
