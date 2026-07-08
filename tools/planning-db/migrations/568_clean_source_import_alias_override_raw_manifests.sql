-- Local rail overrides are not standalone feature-mechanization manifests. The
-- implementation gate treats any raw_manifest with featureId as a complete
-- manifest, so remove that key from previously applied SourceImport alias
-- override rows while preserving the retirement evidence in raw_rail.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = raw_manifest - 'featureId',
  updated_at = now(),
  revision = revision + 1
where source_path in (
    'tools/planning-db/migrations/566_retire_documented_source_import_alias_local_overrides.sql',
    'tools/planning-db/migrations/567_retire_provider_debt_source_import_alias_local_overrides.sql'
  )
  and raw_manifest ? 'featureId';
