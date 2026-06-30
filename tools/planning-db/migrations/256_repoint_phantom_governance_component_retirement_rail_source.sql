-- Repoint the DB-local phantom component retirement rail away from a
-- non-existent migration path so source-drift remains mechanically queryable.

with repair as (
  select
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'::text
      as old_source_path,
    'tools/planning-db/migrations/256_repoint_phantom_governance_component_retirement_rail_source.sql'::text
      as new_source_path
)
update planning_query_store.feature_mechanization_local_rails rail
set
  source_path = repair.new_source_path,
  source_content_sha256 =
    md5('RetirePhantomGovernanceComponents:256')
    || md5('repoint phantom governance component retirement rail source:256'),
  symbol_refs = jsonb_build_array(
    repair.new_source_path || '#RetirePhantomGovernanceComponents'
  ),
  implementation_refs = jsonb_build_array(repair.new_source_path),
  allowed_implementation_surfaces = jsonb_build_array(repair.new_source_path),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'implementationPlan',
      repair.new_source_path,
      'allowedImplementationSurfaces',
      jsonb_build_array(repair.new_source_path),
      'symbols',
      jsonb_build_array(
        jsonb_build_object(
          'name',
          'RetirePhantomGovernanceComponents',
          'path',
          repair.new_source_path,
          'cqRails',
          jsonb_build_array('RetirePhantomGovernanceComponents'),
          'dddOwner',
          'PlanningDbComponentIntegrity',
          'unitTests',
          jsonb_build_array('node --test scripts/planning-db-migrate.test.cjs'),
          'fowlerSignals',
          jsonb_build_array('phantom_component', 'source_drift'),
          'cypressCoverage',
          'not_applicable:migration_only',
          'architectureGuard',
          'pnpm planning:db:integrity:check'
        )
      ),
      'redGreenCycles',
      jsonb_build_array(
        jsonb_build_object(
          'id',
          'phantom-ci-governance-components-source-repair',
          'redTest',
          'pnpm planning:db:integrity:check',
          'greenTest',
          'pnpm planning:db:integrity:check',
          'patchSurfaces',
          jsonb_build_array(repair.new_source_path),
          'expectedFailure',
          'governed_source_drift_query reports RetirePhantomGovernanceComponents against a non-existent migration source.'
        )
      )
    ),
  revision = rail.revision + 1,
  updated_at = now()
from repair
where rail.feature_id = 'CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625'
  and rail.rail_name = 'RetirePhantomGovernanceComponents'
  and rail.source_path = repair.old_source_path;
