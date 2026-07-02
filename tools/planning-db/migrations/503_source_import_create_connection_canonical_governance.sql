-- Keep the SourceImportDialog CreateWarehouseConnection feature manifest tied
-- only to canonical repository governance sources. The user-provided report was
-- input context, not a tracked governing source.

update planning_query_store.feature_mechanization_local_rails
set
  governing_sources = jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  raw_manifest = jsonb_set(
    raw_manifest,
    '{governingSources}',
    jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/503_source_import_create_connection_canonical_governance.sql',
  source_content_sha256 = md5(
    'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:canonical-governance:503'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection';
