-- The post-import rail reconciliation rows are command/query authority
-- overlays, not documentary feature-mechanization manifests. Keep the local
-- rows visible to command_query_rail_query while excluding them from
-- feature-mechanization manifest validation, which keys on raw_manifest.featureId.

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = (
    rail.raw_manifest
    - 'featureId'
    - 'mechanizationStatus'
    - 'implementationPlan'
  ) || jsonb_build_object(
    'localRailReconciliation',
    true,
    'reconciledBy',
    '155_keep_local_rail_reconciliation_out_of_feature_manifests',
    'reconciliationScope',
    'command_query_rail_query'
  ),
  updated_at = now()
where rail.rail_id like 'local#post-import-rail-reconciliation#%';
