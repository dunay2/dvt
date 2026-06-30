-- Local FRONTEND-GAP rail reconciliation rows preserve command/query catalog
-- authority, but they are not implementation feature manifests. Keep the rail
-- rows active for command_query_rail_query while excluding raw_manifest from
-- docs:feature-mechanization:implementation.

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = (
    rail.raw_manifest
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
    '229_frontend_gap_rail_reconciliation_local_manifest_sanitize',
    'reconciliationScope',
    'command_query_rail_query',
    'docs_feature_mechanization_excluded',
    true
  ),
  updated_at = now(),
  revision = revision + 1
where rail.rail_id like 'local#frontend-gap-rail-reconciliation-20260619#%';
