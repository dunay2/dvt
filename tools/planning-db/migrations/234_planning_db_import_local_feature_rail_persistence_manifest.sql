-- DB-first feature mechanization for preserving local feature rails across
-- governance imports. Without this rail, added import helpers are real code but
-- invisible to the implementation guard.

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
  'local#PLANNING-DB-IMPORT-LOCAL-FEATURE-RAIL-PERSISTENCE-20260619#command#preservelocalfeaturemechanizationrails',
  'PLANNING-DB-IMPORT-LOCAL-FEATURE-RAIL-PERSISTENCE-20260619',
  'implemented',
  'PreserveLocalFeatureMechanizationRails',
  'preservelocalfeaturemechanizationrails',
  'command',
  'PlanningDbImport',
  'implemented',
  jsonb_build_array(
    'scripts/planning-db-import.cjs#readLocalFeatureMechanizationRails',
    'scripts/planning-db-import.cjs#refreshLocalFeatureMechanizationRailSourceHashes',
    'scripts/planning-db-import.cjs#restoreLocalFeatureMechanizationRails'
  ),
  jsonb_build_array(
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/233_web_canvas_node_workbench_panel_feature_manifest_post_import_restore.sql',
    'tools/planning-db/migrations/234_planning_db_import_local_feature_rail_persistence_manifest.sql'
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
    'docs/planning/state/planning-control-tower.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/233_web_canvas_node_workbench_panel_feature_manifest_post_import_restore.sql',
    'tools/planning-db/migrations/234_planning_db_import_local_feature_rail_persistence_manifest.sql'
  ),
  jsonb_build_array(
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'node --test scripts/planning-db-import.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'scripts/planning-db-import.cjs',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'scripts/planning-db-import.cjs'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', 'PreserveLocalFeatureMechanizationRails',
    'type', 'command',
    'dddOwner', 'PlanningDbImport',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'PLANNING-DB-IMPORT-LOCAL-FEATURE-RAIL-PERSISTENCE-20260619',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Planning DB governance imports preserve DB-local feature mechanization rails by snapshotting local rails before import and restoring them after imported governance tables reload.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'userStories', jsonb_build_array(
      'As an operator running governance import, DB-authored feature mechanization rails remain visible after the reload.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db-import.cjs',
      'scripts/planning-db-import.test.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/233_web_canvas_node_workbench_panel_feature_manifest_post_import_restore.sql',
      'tools/planning-db/migrations/234_planning_db_import_local_feature_rail_persistence_manifest.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'PlanningDbImport',
      'FeatureMechanizationLocalRail',
      'GovernanceImportReload'
    ),
    'fowlerSignals', jsonb_build_array(
      'documentation_drift',
      'component_ownership_drift'
    ),
    'architectureGuards', jsonb_build_array(
      'scripts/planning-db-import.test.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:planning_db_import_tool'
    ),
    'completionGate', jsonb_build_array(
      'node --test scripts/planning-db-import.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'PreserveLocalFeatureMechanizationRails',
        'type', 'command',
        'dddOwner', 'PlanningDbImport',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'preserve-local-feature-rails-during-governance-import',
        'redTest', 'node --test --test-name-pattern "preserves DB-local feature mechanization rails" scripts/planning-db-import.test.cjs',
        'expectedFailure', 'Governance import reloads could leave DB-local feature mechanization rails unavailable to the implementation guard.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-import.cjs',
          'scripts/planning-db-import.test.cjs'
        ),
        'greenTest', 'node --test --test-name-pattern "preserves DB-local feature mechanization rails" scripts/planning-db-import.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'readLocalFeatureMechanizationRails',
        'path', 'scripts/planning-db-import.cjs',
        'dddOwner', 'PlanningDbImport',
        'cqRails', jsonb_build_array('PreserveLocalFeatureMechanizationRails'),
        'fowlerSignals', jsonb_build_array('documentation_drift'),
        'architectureGuard', 'scripts/planning-db-import.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_import_tool',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-import.test.cjs')
      ),
      jsonb_build_object(
        'name', 'refreshLocalFeatureMechanizationRailSourceHashes',
        'path', 'scripts/planning-db-import.cjs',
        'dddOwner', 'PlanningDbImport',
        'cqRails', jsonb_build_array('PreserveLocalFeatureMechanizationRails'),
        'fowlerSignals', jsonb_build_array('documentation_drift'),
        'architectureGuard', 'scripts/planning-db-import.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_import_tool',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-import.test.cjs')
      ),
      jsonb_build_object(
        'name', 'restoreLocalFeatureMechanizationRails',
        'path', 'scripts/planning-db-import.cjs',
        'dddOwner', 'PlanningDbImport',
        'cqRails', jsonb_build_array('PreserveLocalFeatureMechanizationRails'),
        'fowlerSignals', jsonb_build_array('documentation_drift'),
        'architectureGuard', 'scripts/planning-db-import.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_import_tool',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-import.test.cjs')
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
