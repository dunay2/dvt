-- The Planning DB import now reasserts retirement for two CI policy-validation
-- phantom split components after every governance reload. Keep that new import
-- symbol declared in the DB-local feature mechanization manifest.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql#RetirePhantomGovernanceComponents',
    'scripts/planning-db-import.cjs#reconcileSupersededCiPolicyValidationSplitComponents'
  ),
  implementation_refs = jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/268_register_ci_policy_validation_reconcile_symbol.sql'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/268_register_ci_policy_validation_reconcile_symbol.sql'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-import.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'implementationPlan', 'scripts/planning-db-import.cjs',
    'currentImplementationSourcePath', 'scripts/planning-db-import.cjs',
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
      'scripts/planning-db-import.cjs',
      'scripts/planning-db-import.test.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/268_register_ci_policy_validation_reconcile_symbol.sql'
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'RetirePhantomGovernanceComponents',
        'path', 'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
        'dddOwner', 'PlanningDbComponentIntegrity',
        'cqRails', jsonb_build_array('RetirePhantomGovernanceComponents'),
        'fowlerSignals', jsonb_build_array('phantom_component', 'source_drift'),
        'architectureGuard', 'pnpm planning:db:integrity:check',
        'cypressCoverage', 'not_applicable:migration_only',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-migrate.test.cjs')
      ),
      jsonb_build_object(
        'name', 'reconcileSupersededCiPolicyValidationSplitComponents',
        'path', 'scripts/planning-db-import.cjs',
        'dddOwner', 'PlanningDbComponentIntegrity',
        'cqRails', jsonb_build_array('RetirePhantomGovernanceComponents'),
        'fowlerSignals', jsonb_build_array('post_import_reconciliation', 'phantom_component'),
        'architectureGuard', 'pnpm planning:db:integrity:check',
        'cypressCoverage', 'not_applicable:planning_db_import',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-import.test.cjs')
      )
    ),
    'postImportFeatureManifestReconciledBy',
    '268_register_ci_policy_validation_reconcile_symbol'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625'
  and rail_type = 'command'
  and normalized_rail_name = 'retirephantomgovernancecomponents';
