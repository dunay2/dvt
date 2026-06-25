-- DB-first feature mechanization for the materialized code-symbol duplicate
-- projection. The import helper is an exported code symbol and must remain
-- declared in Planning DB, not only in source comments or markdown.

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
  'local#PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625#command#refreshcodesymbolduplicateprojection',
  'PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625',
  'implemented',
  'RefreshCodeSymbolDuplicateProjection',
  'refreshcodesymbolduplicateprojection',
  'command',
  'PlanningDbCodeSymbolReadModel',
  'implemented',
  jsonb_build_array(
    'scripts/planning-db-import.cjs#refreshCodeSymbolMaterializedProjection',
    'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql#code_symbol_effective_inventory_projection',
    'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql#code_symbol_problem_query'
  ),
  jsonb_build_array(
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql',
    'tools/planning-db/migrations/270_register_code_symbol_projection_refresh_feature.sql'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/planning/status/governance-document-rule-inventory.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql',
    'tools/planning-db/migrations/270_register_code_symbol_projection_refresh_feature.sql'
  ),
  jsonb_build_array(
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm planning:db:integrity:check'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm planning:db:import -- --governance-only',
    'node --test scripts/planning-db-import.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'node --test scripts/planning-db-query.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/270_register_code_symbol_projection_refresh_feature.sql',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path =
        'tools/planning-db/migrations/270_register_code_symbol_projection_refresh_feature.sql'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', 'RefreshCodeSymbolDuplicateProjection',
    'type', 'command',
    'dddOwner', 'PlanningDbCodeSymbolReadModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Planning DB duplicate-symbol diagnostics use a materialized effective ownership projection refreshed by the governance import rail, avoiding repeated expansion of heavyweight component ownership views during operator queries.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'userStories', jsonb_build_array(
      'As an operator triaging code-symbol duplicate drift, the Planning DB query returns from an indexed DB projection instead of repeatedly expanding component ownership views.',
      'As an operator refreshing governance data, the import command refreshes the materialized projection so duplicate diagnostics remain current.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db-import.cjs',
      'scripts/planning-db-import.test.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql',
      'tools/planning-db/migrations/270_register_code_symbol_projection_refresh_feature.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'PlanningDbCodeSymbolReadModel',
      'CodeSymbolEffectiveInventoryProjection',
      'CodeSymbolDuplicateDiagnostics',
      'PlanningDbGovernanceImport'
    ),
    'fowlerSignals', jsonb_build_array(
      'slow_query_projection',
      'duplicate_semantics',
      'component_ownership_drift'
    ),
    'architectureGuards', jsonb_build_array(
      'scripts/planning-db-import.test.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:planning_db_query_tool'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm planning:db:import -- --governance-only',
      'node --test scripts/planning-db-import.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'node --test scripts/planning-db-query.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RefreshCodeSymbolDuplicateProjection',
        'type', 'command',
        'dddOwner', 'PlanningDbCodeSymbolReadModel',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ListCodeSymbolDuplicateDiagnostics',
        'type', 'query',
        'dddOwner', 'PlanningDbCodeSymbolReadModel',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'materialized-code-symbol-duplicate-query-inputs',
        'redTest',
        'node --test --test-name-pattern "tracked migrations materialize code symbol duplicate query inputs" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'Duplicate diagnostics repeatedly expand component ownership views instead of reading from an indexed Planning DB projection.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "tracked migrations materialize code symbol duplicate query inputs" scripts/planning-db-migrate.test.cjs'
      ),
      jsonb_build_object(
        'id', 'refresh-materialized-code-symbol-projection-after-import',
        'redTest',
        'node --test --test-name-pattern "planning DB import refreshes the materialized code symbol duplicate projection" scripts/planning-db-import.test.cjs',
        'expectedFailure',
        'Governance import updates code_symbols without refreshing the materialized duplicate-query projection.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-import.cjs',
          'scripts/planning-db-import.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "planning DB import refreshes the materialized code symbol duplicate projection" scripts/planning-db-import.test.cjs'
      ),
      jsonb_build_object(
        'id', 'declare-refresh-symbol-in-db-feature-mechanization',
        'redTest',
        'pnpm docs:feature-mechanization:implementation',
        'expectedFailure',
        'The exported refreshCodeSymbolMaterializedProjection helper is not declared in Planning DB feature mechanization symbols.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/270_register_code_symbol_projection_refresh_feature.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest',
        'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'refreshCodeSymbolMaterializedProjection',
        'path', 'scripts/planning-db-import.cjs',
        'dddOwner', 'PlanningDbCodeSymbolReadModel',
        'cqRails', jsonb_build_array('RefreshCodeSymbolDuplicateProjection'),
        'fowlerSignals', jsonb_build_array('slow_query_projection'),
        'architectureGuard', 'scripts/planning-db-import.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_import',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-import.test.cjs')
      ),
      jsonb_build_object(
        'name', 'code_symbol_effective_inventory_projection',
        'path', 'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql',
        'dddOwner', 'PlanningDbCodeSymbolReadModel',
        'cqRails', jsonb_build_array('ListCodeSymbolDuplicateDiagnostics'),
        'fowlerSignals', jsonb_build_array('slow_query_projection', 'component_ownership_drift'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_query_tool',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-migrate.test.cjs')
      ),
      jsonb_build_object(
        'name', 'code_symbol_problem_query',
        'path', 'tools/planning-db/migrations/269_code_symbol_problem_query_materialized_projection.sql',
        'dddOwner', 'PlanningDbCodeSymbolReadModel',
        'cqRails', jsonb_build_array('ListCodeSymbolDuplicateDiagnostics'),
        'fowlerSignals', jsonb_build_array('duplicate_semantics'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_query_tool',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-migrate.test.cjs')
      )
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
