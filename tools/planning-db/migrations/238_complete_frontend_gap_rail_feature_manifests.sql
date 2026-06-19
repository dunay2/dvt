-- Complete the DB-local feature mechanization manifests created by migration
-- 226. Fresh CI validates raw_manifest as the authoritative manifest for these
-- DB-local rails, so it must satisfy the same schema as source-file manifests.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'featureId', 'FRONTEND-GAP-RAIL-RECONCILIATION-20260619',
      'mechanizationStatus', mechanization_status,
      'noHumanDecisionsRemaining', true,
      'implementationPlan', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      'componentGuides', jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/architecture/fowler-opportunity-planning-governance.md',
        'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
      ),
      'userStories', jsonb_build_array(
        'As an architect, I can see frontend command/query gap rails as implemented or retired DB facts.',
        'As a reviewer, I can reject frontend rail aliases that remain active without implementation evidence.'
      ),
      'governingSources', jsonb_build_array(
        'AGENTS.md',
        'docs/architecture/command-query-rail-governance.md',
        'docs/architecture/fowler-opportunity-planning-governance.md',
        'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
      ),
      'allowedImplementationSurfaces', allowed_implementation_surfaces,
      'forbiddenImplementationSurfaces', jsonb_build_array(
        'parallel command/query rail aliases',
        'source-path-only feature manifests without Planning DB authority',
        'active gap rails without component, DDD owner, or validation evidence'
      ),
      'domainObjects', jsonb_build_array(
        ddd_owner,
        rail_name,
        'FrontendGapRailReconciliation'
      ),
      'fowlerSignals', jsonb_build_array(
        'duplicate command/query vocabulary',
        'boundary drift',
        'source-path drift'
      ),
      'architectureGuards', architecture_guards,
      'cypressFlows', jsonb_build_array('N/A - Planning DB command/query rail reconciliation'),
      'completionGate', completion_gate || jsonb_build_array('pnpm verify:prepush'),
      'commandQueryRails', jsonb_build_array(
        jsonb_build_object(
          'name', rail_name,
          'type', rail_type,
          'status', rail_status,
          'dddOwner', ddd_owner
        )
      ),
      'redGreenCycles', jsonb_build_array(
        jsonb_build_object(
          'id', 'frontend-gap-rail-reconciliation-' || lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')),
          'redTest', 'pnpm planning:db:query rail-vocabulary --no-refresh --limit 80',
          'expectedFailure', 'rail appears as gap, surface alias, or duplicate vocabulary finding before reconciliation',
          'patchSurfaces', jsonb_build_array(
            'planning_query_store.feature_mechanization_local_rails',
            'planning_query_store.command_query_rail_query',
            'planning_query_store.command_query_rail_vocabulary_query'
          ),
          'greenTest', 'pnpm planning:db:integrity:check'
        )
      ),
      'symbols', jsonb_build_array(
        jsonb_build_object(
          'name', rail_name,
          'path', source_path,
          'dddOwner', ddd_owner,
          'cqRails', jsonb_build_array(rail_name),
          'fowlerSignals', jsonb_build_array(
            'duplicate command/query vocabulary',
            'boundary drift'
          ),
          'architectureGuard', 'pnpm planning:db:integrity:check',
          'cypressCoverage', 'N/A',
          'unitTests', jsonb_build_array(
            'node --test scripts/planning-db-migrate.test.cjs',
            'node --test scripts/planning-db-integrity-check.test.cjs'
          )
        )
      )
    ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'FRONTEND-GAP-RAIL-RECONCILIATION-20260619';
