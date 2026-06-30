-- Retire DB-local CI/governance helper components whose repo_path points to
-- files that no longer exist. These rows are historical component evidence,
-- not implemented source ownership.

with phantom_components(component_id, replacement_contract) as (
  values
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
      'Superseded phantom split: scripts/planning-db/frontend-inventory-table.cjs does not exist. Frontend inventory behavior is owned by the active Planning DB inventory readers.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
      'Superseded phantom split: scripts/planning-db/query-filter.cjs does not exist. Query filtering behavior is owned by the active Planning DB query readers.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FORMAT',
      'Superseded phantom split: scripts/planning-db/query-format.cjs does not exist. Query output formatting is owned by the active Planning DB query readers.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
      'Superseded phantom split: scripts/policy-validation-files.cjs does not exist. Policy validation file discovery must be remapped only with a real source file.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
      'Superseded phantom split: scripts/policy-validation-text.cjs does not exist. Policy validation text normalization must be remapped only with a real source file.'
    )
)
update architecture.component component
set
  status = 'deprecated',
  repo_path = 'planning_query_store.governance_component_local_definitions#' || component.component_id,
  public_contract = phantom_components.replacement_contract,
  updated_at = now()
from phantom_components
where component.component_id = phantom_components.component_id;

with phantom_components(component_id, replacement_contract) as (
  values
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
      'Superseded phantom split: scripts/planning-db/frontend-inventory-table.cjs does not exist. Frontend inventory behavior is owned by the active Planning DB inventory readers.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
      'Superseded phantom split: scripts/planning-db/query-filter.cjs does not exist. Query filtering behavior is owned by the active Planning DB query readers.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FORMAT',
      'Superseded phantom split: scripts/planning-db/query-format.cjs does not exist. Query output formatting is owned by the active Planning DB query readers.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
      'Superseded phantom split: scripts/policy-validation-files.cjs does not exist. Policy validation file discovery must be remapped only with a real source file.'
    ),
    (
      'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
      'Superseded phantom split: scripts/policy-validation-text.cjs does not exist. Policy validation text normalization must be remapped only with a real source file.'
    )
)
update planning_query_store.governance_component_local_definitions definition
set
  status = 'superseded',
  source_path = 'planning_query_store.governance_component_local_definitions#' || definition.component_id,
  source_content_sha256 =
    md5(definition.component_id || ':phantom-component-retired')
    || md5(definition.component_id || ':20260625'),
  owned_concern = phantom_components.replacement_contract,
  revision = greatest(definition.revision, 1) + 1
from phantom_components
where definition.component_id = phantom_components.component_id;

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
values (
  'local#CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625#command#retirephantomgovernancecomponents',
  'CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625',
  'implemented',
  'RetirePhantomGovernanceComponents',
  'retirephantomgovernancecomponents',
  'command',
  'PlanningDbComponentIntegrity',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql#RetirePhantomGovernanceComponents'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'
  ),
  '[]'::jsonb,
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'
  ),
  jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
  md5('246_retire_phantom_ci_governance_helper_components.sql')
    || md5('CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625'),
  jsonb_build_object(
    'name', 'RetirePhantomGovernanceComponents',
    'type', 'command',
    'status', 'implemented',
    'dddOwner', 'PlanningDbComponentIntegrity'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
    'componentGuides', jsonb_build_array(
      'docs/planning/status/governance-document-rule-inventory.md'
    ),
    'userStories', jsonb_build_array(
      'Planning DB integrity does not report implemented components for files that no longer exist.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'buzon/**'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RetirePhantomGovernanceComponents',
        'type', 'command',
        'dddOwner', 'PlanningDbComponentIntegrity',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'PlanningDbComponentIntegrity',
        'type', 'integrity read model',
        'owner', 'Planning DB governance'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'phantom_component',
      'source_drift'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'Planning DB integrity',
        'command', 'pnpm planning:db:integrity:check'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:migration_only',
        'command', 'pnpm planning:db:integrity:check'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'phantom-ci-governance-components',
        'redTest', 'pnpm planning:db:integrity:check',
        'expectedFailure', 'component_path_without_files reports five implemented phantom components.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'
        ),
        'greenTest', 'pnpm planning:db:integrity:check'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'RetirePhantomGovernanceComponents',
        'path', 'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
        'dddOwner', 'PlanningDbComponentIntegrity',
        'cqRails', jsonb_build_array('RetirePhantomGovernanceComponents'),
        'fowlerSignals', jsonb_build_array('phantom_component', 'source_drift'),
        'architectureGuard', 'pnpm planning:db:integrity:check',
        'cypressCoverage', 'not_applicable:migration_only',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-migrate.test.cjs')
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  1,
  'codex'
)
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1;
