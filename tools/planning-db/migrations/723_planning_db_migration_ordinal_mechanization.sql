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
  'local#A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1#command#prepareplanningdbforcigate',
  'A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1',
  'implemented',
  'PreparePlanningDbForCiGate',
  'prepareplanningdbforcigate',
  'command',
  'PlanningDbLifecycle',
  'implemented',
  jsonb_build_array(
    'scripts/planning-db-migrate.cjs#analyzeMigrationOrdinals',
    'scripts/planning-db-migrate.cjs#assertMigrationOrdinalPolicy',
    'scripts/planning-db-migrate.cjs#buildMigrationFileNameFingerprint',
    'scripts/planning-db-migrate.cjs#formatMigrationOrdinal',
    'scripts/planning-db-migrate.cjs#migrationOrdinalPolicy',
    'scripts/planning-db-migrate.cjs#parseMigrationOrdinal'
  ),
  jsonb_build_array(
    'scripts/planning-db-migrate.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/723_planning_db_migration_ordinal_mechanization.sql'
  ),
  jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'scripts/planning-db-migrate.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/723_planning_db_migration_ordinal_mechanization.sql'
  ),
  jsonb_build_array('node --test scripts/planning-db-migrate.test.cjs'),
  jsonb_build_array(
    'pnpm test:planning:db:migrations',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/723_planning_db_migration_ordinal_mechanization.sql',
  md5('A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1:PreparePlanningDbForCiGate:723'),
  jsonb_build_object(
    'name', 'PreparePlanningDbForCiGate',
    'type', 'command',
    'status', 'implemented',
    'dddOwner', 'PlanningDbLifecycle'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Freeze applied migration filename identities and reject duplicate ordinals from the first strict migration before any SQL or database query runs.',
    'componentGuides', jsonb_build_array(
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CORE'
    ),
    'userStories', jsonb_build_array(
      'A contributor receives a deterministic collision error before integrating a parallel migration.',
      'An operator can read the highest and next safe migration ordinal from the policy report.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db-migrate.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/723_planning_db_migration_ordinal_mechanization.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'tools/planning-db/migrations/**#rename_applied_migration',
      'scripts/**#second_planning_db_migrator'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'PreparePlanningDbForCiGate',
        'type', 'command',
        'dddOwner', 'PlanningDbLifecycle',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'MigrationOrdinalPolicy',
        'type', 'policy',
        'owner', 'PlanningDbLifecycle'
      ),
      jsonb_build_object(
        'name', 'MigrationOrdinalReport',
        'type', 'result',
        'owner', 'PlanningDbLifecycle'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'single_source_of_truth',
      'service_layer',
      'evolutionary_architecture'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'Planning DB migration ordinal policy',
        'command', 'node --test scripts/planning-db-migrate.test.cjs'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:repository_migration_policy',
        'command', 'pnpm test:planning:db:migrations'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'migration-ordinal-uniqueness',
        'redTest', 'node --test --test-name-pattern "migration ordinal" scripts/planning-db-migrate.test.cjs',
        'expectedFailure', 'Parallel migration files with the same strict ordinal are accepted and sorted by suffix.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.cjs',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest', 'pnpm test:planning:db:migrations'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'migrationOrdinalPolicy',
        'path', 'scripts/planning-db-migrate.cjs',
        'dddOwner', 'PlanningDbLifecycle',
        'cqRails', jsonb_build_array('PreparePlanningDbForCiGate'),
        'fowlerSignals', jsonb_build_array('single_source_of_truth', 'policy'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:repository_migration_policy',
        'unitTests', jsonb_build_array('scripts/planning-db-migrate.test.cjs')
      ),
      jsonb_build_object(
        'name', 'buildMigrationFileNameFingerprint',
        'path', 'scripts/planning-db-migrate.cjs',
        'dddOwner', 'PlanningDbLifecycle',
        'cqRails', jsonb_build_array('PreparePlanningDbForCiGate'),
        'fowlerSignals', jsonb_build_array('pure_function'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:repository_migration_policy',
        'unitTests', jsonb_build_array('scripts/planning-db-migrate.test.cjs')
      ),
      jsonb_build_object(
        'name', 'parseMigrationOrdinal',
        'path', 'scripts/planning-db-migrate.cjs',
        'dddOwner', 'PlanningDbLifecycle',
        'cqRails', jsonb_build_array('PreparePlanningDbForCiGate'),
        'fowlerSignals', jsonb_build_array('pure_function'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:repository_migration_policy',
        'unitTests', jsonb_build_array('scripts/planning-db-migrate.test.cjs')
      ),
      jsonb_build_object(
        'name', 'analyzeMigrationOrdinals',
        'path', 'scripts/planning-db-migrate.cjs',
        'dddOwner', 'PlanningDbLifecycle',
        'cqRails', jsonb_build_array('PreparePlanningDbForCiGate'),
        'fowlerSignals', jsonb_build_array('pure_function', 'query_model'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:repository_migration_policy',
        'unitTests', jsonb_build_array('scripts/planning-db-migrate.test.cjs')
      ),
      jsonb_build_object(
        'name', 'formatMigrationOrdinal',
        'path', 'scripts/planning-db-migrate.cjs',
        'dddOwner', 'PlanningDbLifecycle',
        'cqRails', jsonb_build_array('PreparePlanningDbForCiGate'),
        'fowlerSignals', jsonb_build_array('pure_function'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:repository_migration_policy',
        'unitTests', jsonb_build_array('scripts/planning-db-migrate.test.cjs')
      ),
      jsonb_build_object(
        'name', 'assertMigrationOrdinalPolicy',
        'path', 'scripts/planning-db-migrate.cjs',
        'dddOwner', 'PlanningDbLifecycle',
        'cqRails', jsonb_build_array('PreparePlanningDbForCiGate'),
        'fowlerSignals', jsonb_build_array('policy', 'fail_closed'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:repository_migration_policy',
        'unitTests', jsonb_build_array('scripts/planning-db-migrate.test.cjs')
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm test:planning:db:migrations',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  0,
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
