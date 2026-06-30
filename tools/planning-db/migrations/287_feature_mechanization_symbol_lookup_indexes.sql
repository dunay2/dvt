-- Speed feature-mechanization symbol lookups that filter by implementation
-- path before expanding raw_manifest->symbols. The reader uses JSONB
-- containment so both imported and DB-local rails need the same lookup shape.

create index if not exists command_query_rails_raw_manifest_gin_idx
  on planning_query_store.command_query_rails using gin (raw_manifest jsonb_path_ops);

create index if not exists feature_mechanization_local_rails_raw_manifest_gin_idx
  on planning_query_store.feature_mechanization_local_rails using gin (raw_manifest jsonb_path_ops);
