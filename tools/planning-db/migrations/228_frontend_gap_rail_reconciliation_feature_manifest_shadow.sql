-- The FRONTEND-GAP rail reconciliation rows are command/query catalog
-- overlays, not feature-mechanization implementation manifests. Imported docs
-- still expose raw_manifest.featureId for these retired gap rails, so create
-- local overlays for the same feature/type/name partitions. The canonical
-- projection prefers local rows by source_rank, while the implementation guard
-- ignores these rows because raw_manifest no longer carries featureId.

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
select distinct on (
  imported.feature_id,
  imported.rail_type,
  imported.normalized_rail_name
)
  'local#frontend-gap-rail-reconciliation-shadow#'
    || imported.rail_type
    || '#'
    || imported.normalized_rail_name as rail_id,
  imported.feature_id,
  imported.mechanization_status,
  imported.rail_name,
  imported.normalized_rail_name,
  imported.rail_type,
  imported.ddd_owner,
  imported.rail_status,
  imported.symbol_refs,
  imported.implementation_refs,
  imported.documentation_refs,
  imported.governing_sources,
  imported.allowed_implementation_surfaces,
  imported.architecture_guards,
  imported.completion_gate,
  imported.source_path,
  imported.source_content_sha256,
  imported.raw_rail || jsonb_build_object(
    'localRailReconciliation',
    true,
    'reconciledBy',
    '228_frontend_gap_rail_reconciliation_feature_manifest_shadow',
    'reconciliationScope',
    'command_query_rail_query'
  ),
  (
    imported.raw_manifest
    - 'featureId'
    - 'mechanizationStatus'
    - 'implementationPlan'
    - 'componentGuides'
    - 'symbols'
    - 'architectureGuards'
    - 'completionGate'
    - 'governingSources'
  ) || jsonb_build_object(
    'localRailReconciliation',
    true,
    'reconciledBy',
    '228_frontend_gap_rail_reconciliation_feature_manifest_shadow',
    'reconciliationScope',
    'command_query_rail_query',
    'source_rank',
    'local'
  ),
  1,
  'codex'
from planning_query_store.command_query_rails imported
where imported.feature_id = 'FRONTEND-GAP-RAIL-RECONCILIATION-20260619'
order by
  imported.feature_id,
  imported.rail_type,
  imported.normalized_rail_name,
  imported.imported_at desc,
  imported.rail_id
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
