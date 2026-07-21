-- Complete DB-first mechanization for the symbols introduced by the shared
-- run operational truth slice. The product behavior continues to use the
-- existing ListRuns, GetRunStatus, ListWarehouseConnections, and
-- ResolveVisibleCanvasNode rails; this migration creates no parallel intent.

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name,
  rail_type, ddd_owner, rail_status, symbol_refs, implementation_refs,
  documentation_refs, governing_sources, allowed_implementation_surfaces,
  architecture_guards, completion_gate, source_path, source_content_sha256,
  raw_rail, raw_manifest, revision, created_by
)
values (
  'local#E-RUN-OPERATIONAL-TRUTH-1#query#listruns',
  'E-RUN-OPERATIONAL-TRUTH-1',
  'implemented',
  'ListRuns',
  'listruns',
  'query',
  'Runs read model',
  'implemented',
  jsonb_build_array(
    'apps/api/src/application/ports/runtime.ts#GetRunStatusResult',
    'apps/api/src/application/ports/runtime.ts#RunListItemDto',
    'apps/api/src/application/ports/runtime.ts#RunOperationalTruthDto',
    'apps/api/src/application/services/listRunsUseCase.ts#RUN_STATUS_READ_CONCURRENCY',
    'apps/api/src/application/services/runOperationalTruth.ts#ProjectRunOperationalTruthInput',
    'apps/api/src/application/services/runOperationalTruth.ts#RunOperationalTruthEvidence',
    'apps/api/src/application/services/runOperationalTruth.ts#deriveDurationMs',
    'apps/api/src/application/services/runOperationalTruth.ts#projectRunOperationalTruth',
    'apps/web/src/app/ports/runs.ts#UiRunStatus',
    'apps/web/src/app/queries/runsQueries.ts#RUNS_LIST_STATUS_REFRESH_INTERVAL_MS',
    'apps/web/src/app/queries/runsQueries.ts#RUN_DETAIL_STATUS_REFRESH_INTERVAL_MS',
    'apps/web/src/app/queries/runsQueries.ts#isActiveRunStatus',
    'apps/web/src/app/services/runs/runsApiDecoders.ts#asFiniteNumber',
    'apps/web/src/app/views/RunsView.tsx#toFocusedRunModel',
    'apps/web/src/app/views/runs/runOperationalTableModel.ts#parseDateTime'
  ),
  jsonb_build_array(
    'apps/api/src/application/ports/runtime.ts',
    'apps/api/src/application/services/getRunStatusUseCase.ts',
    'apps/api/src/application/services/listRunsUseCase.ts',
    'apps/api/src/application/services/runOperationalTruth.ts',
    'apps/api/test/application/services/getRunStatusUseCase.test.ts',
    'apps/api/test/application/services/listRunsUseCase.test.ts',
    'apps/api/test/application/services/runOperationalTruth.test.ts',
    'apps/web/src/app/ports/runs.ts',
    'apps/web/src/app/queries/runsQueries.ts',
    'apps/web/src/app/services/runs/runsApiDecoders.ts',
    'apps/web/src/app/services/runs/runsApiSnapshotMapper.test.ts',
    'apps/web/src/app/views/RunsView.test.tsx',
    'apps/web/src/app/views/RunsView.tsx',
    'apps/web/src/app/views/runs/runOperationalTableModel.test.ts',
    'apps/web/src/app/views/runs/runOperationalTableModel.ts',
    'apps/web/src/app/views/runs/useRunWorkspace.test.tsx',
    'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql'
  ),
  jsonb_build_array(
    'docs/architecture/system/subsystems/read/index.md',
    'docs/architecture/components/web/frontend-command-query-rail-inventory.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/system/subsystems/read/index.md'
  ),
  jsonb_build_array(
    'apps/api/src/application/ports/runtime.ts',
    'apps/api/src/application/services/getRunStatusUseCase.ts',
    'apps/api/src/application/services/listRunsUseCase.ts',
    'apps/api/src/application/services/runOperationalTruth.ts',
    'apps/api/test/application/services/getRunStatusUseCase.test.ts',
    'apps/api/test/application/services/listRunsUseCase.test.ts',
    'apps/api/test/application/services/runOperationalTruth.test.ts',
    'apps/web/src/app/ports/runs.ts',
    'apps/web/src/app/queries/runsQueries.ts',
    'apps/web/src/app/services/runs/runsApiDecoders.ts',
    'apps/web/src/app/services/runs/runsApiSnapshotMapper.test.ts',
    'apps/web/src/app/views/RunsView.test.tsx',
    'apps/web/src/app/views/RunsView.tsx',
    'apps/web/src/app/views/runs/runOperationalTableModel.test.ts',
    'apps/web/src/app/views/runs/runOperationalTableModel.ts',
    'apps/web/src/app/views/runs/useRunWorkspace.test.tsx',
    'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql'
  ),
  jsonb_build_array(
    'pnpm --filter dvt-api exec vitest run test/application/services/runOperationalTruth.test.ts test/application/services/listRunsUseCase.test.ts test/application/services/getRunStatusUseCase.test.ts',
    'pnpm --filter @dvt/web test:unit:run -- src/app/services/runs/runsApiSnapshotMapper.test.ts src/app/views/runs/runOperationalTableModel.test.ts',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/RunsView.test.tsx src/app/views/runs/RunStates.workspaceBasics.test.tsx src/app/views/runs/useRunWorkspace.test.tsx'
  ),
  jsonb_build_array(
    'pnpm docs:feature-mechanization:implementation',
    'pnpm planning:db:integrity:check',
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql',
  repeat(md5('E-RUN-OPERATIONAL-TRUTH-1:ListRuns:795'), 2),
  jsonb_build_object(
    'name', 'ListRuns',
    'type', 'query',
    'dddOwner', 'Runs read model',
    'status', 'implemented',
    'componentRole', 'List and detail consume one canonical run operational truth projection.'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-RUN-OPERATIONAL-TRUTH-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Project canonical run metadata and lifecycle evidence once, then preserve that truth through API list/detail and web presentation.',
    'componentGuides', jsonb_build_array(
      'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
      'SYS-WEB-SERVICES-RUNS',
      'SYS-WEB-VIEWS-RUNS'
    ),
    'userStories', jsonb_build_array(
      'An operator sees the same run status, timing, identity, and failure evidence in list and detail views.',
      'An active run refreshes until terminal without inventing missing timestamps or duration.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/system/subsystems/read/index.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/api/src/application/ports/runtime.ts',
      'apps/api/src/application/services/getRunStatusUseCase.ts',
      'apps/api/src/application/services/listRunsUseCase.ts',
      'apps/api/src/application/services/runOperationalTruth.ts',
      'apps/web/src/app/ports/runs.ts',
      'apps/web/src/app/queries/runsQueries.ts',
      'apps/web/src/app/services/runs/runsApiDecoders.ts',
      'apps/web/src/app/views/RunsView.tsx',
      'apps/web/src/app/views/runs/runOperationalTableModel.ts',
      'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/**#fabricated_run_timestamp',
      'apps/**#parallel_run_status_projection',
      'apps/**#clock_derived_run_lifecycle'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListRuns',
        'type', 'query',
        'dddOwner', 'Runs read model',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'GetRunStatus',
        'type', 'query',
        'dddOwner', 'Run status read model',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'RunOperationalTruthDto',
        'type', 'read model',
        'owner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'query_object',
      'presentation_model',
      'single_source_of_truth',
      'service_layer'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'API operational truth projection',
        'command', 'pnpm --filter dvt-api exec vitest run test/application/services/runOperationalTruth.test.ts test/application/services/listRunsUseCase.test.ts test/application/services/getRunStatusUseCase.test.ts'
      ),
      jsonb_build_object(
        'name', 'Web operational truth presentation',
        'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/RunsView.test.tsx src/app/views/runs/RunStates.workspaceBasics.test.tsx src/app/views/runs/useRunWorkspace.test.tsx'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'protected_sql_first_run_and_source_import',
        'command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'GetRunStatusResult',
        'path', 'apps/api/src/application/ports/runtime.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('GetRunStatus'),
        'fowlerSignals', jsonb_build_array('data_transfer_object', 'query_result'),
        'architectureGuard', 'apps/api/test/application/services/getRunStatusUseCase.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/getRunStatusUseCase.test.ts')
      ),
      jsonb_build_object(
        'name', 'RunListItemDto',
        'path', 'apps/api/src/application/ports/runtime.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('ListRuns'),
        'fowlerSignals', jsonb_build_array('data_transfer_object', 'query_result'),
        'architectureGuard', 'apps/api/test/application/services/listRunsUseCase.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/listRunsUseCase.test.ts')
      ),
      jsonb_build_object(
        'name', 'RunOperationalTruthDto',
        'path', 'apps/api/src/application/ports/runtime.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('data_transfer_object', 'single_source_of_truth'),
        'architectureGuard', 'apps/api/test/application/services/runOperationalTruth.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/runOperationalTruth.test.ts')
      ),
      jsonb_build_object(
        'name', 'RUN_STATUS_READ_CONCURRENCY',
        'path', 'apps/api/src/application/services/listRunsUseCase.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('ListRuns'),
        'fowlerSignals', jsonb_build_array('bounded_concurrency', 'query_object'),
        'architectureGuard', 'apps/api/test/application/services/listRunsUseCase.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/listRunsUseCase.test.ts')
      ),
      jsonb_build_object(
        'name', 'ProjectRunOperationalTruthInput',
        'path', 'apps/api/src/application/services/runOperationalTruth.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('parameter_object', 'query_object'),
        'architectureGuard', 'apps/api/test/application/services/runOperationalTruth.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/runOperationalTruth.test.ts')
      ),
      jsonb_build_object(
        'name', 'RunOperationalTruthEvidence',
        'path', 'apps/api/src/application/services/runOperationalTruth.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('value_object', 'query_evidence'),
        'architectureGuard', 'apps/api/test/application/services/runOperationalTruth.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/runOperationalTruth.test.ts')
      ),
      jsonb_build_object(
        'name', 'deriveDurationMs',
        'path', 'apps/api/src/application/services/runOperationalTruth.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('pure_function', 'derived_value'),
        'architectureGuard', 'apps/api/test/application/services/runOperationalTruth.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/runOperationalTruth.test.ts')
      ),
      jsonb_build_object(
        'name', 'projectRunOperationalTruth',
        'path', 'apps/api/src/application/services/runOperationalTruth.ts',
        'dddOwner', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('mapper', 'pure_function', 'single_source_of_truth'),
        'architectureGuard', 'apps/api/test/application/services/runOperationalTruth.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/api/test/application/services/runOperationalTruth.test.ts')
      ),
      jsonb_build_object(
        'name', 'UiRunStatus',
        'path', 'apps/web/src/app/ports/runs.ts',
        'dddOwner', 'SYS-WEB-SERVICES-RUNS',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('value_object', 'anti_corruption_layer'),
        'architectureGuard', 'apps/web/src/app/services/runs/runsApiSnapshotMapper.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/services/runs/runsApiSnapshotMapper.test.ts')
      ),
      jsonb_build_object(
        'name', 'RUNS_LIST_STATUS_REFRESH_INTERVAL_MS',
        'path', 'apps/web/src/app/queries/runsQueries.ts',
        'dddOwner', 'SYS-WEB-SERVICES-RUNS',
        'cqRails', jsonb_build_array('ListRuns'),
        'fowlerSignals', jsonb_build_array('query_policy', 'explicit_configuration'),
        'architectureGuard', 'apps/web/src/app/views/runs/useRunWorkspace.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/runs/useRunWorkspace.test.tsx')
      ),
      jsonb_build_object(
        'name', 'RUN_DETAIL_STATUS_REFRESH_INTERVAL_MS',
        'path', 'apps/web/src/app/queries/runsQueries.ts',
        'dddOwner', 'SYS-WEB-SERVICES-RUNS',
        'cqRails', jsonb_build_array('GetRunStatus'),
        'fowlerSignals', jsonb_build_array('query_policy', 'explicit_configuration'),
        'architectureGuard', 'apps/web/src/app/views/runs/useRunWorkspace.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/runs/useRunWorkspace.test.tsx')
      ),
      jsonb_build_object(
        'name', 'isActiveRunStatus',
        'path', 'apps/web/src/app/queries/runsQueries.ts',
        'dddOwner', 'SYS-WEB-SERVICES-RUNS',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('specification', 'pure_function'),
        'architectureGuard', 'apps/web/src/app/views/runs/useRunWorkspace.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/runs/useRunWorkspace.test.tsx')
      ),
      jsonb_build_object(
        'name', 'asFiniteNumber',
        'path', 'apps/web/src/app/services/runs/runsApiDecoders.ts',
        'dddOwner', 'SYS-WEB-SERVICES-RUNS',
        'cqRails', jsonb_build_array('ListRuns', 'GetRunStatus'),
        'fowlerSignals', jsonb_build_array('anti_corruption_layer', 'pure_function'),
        'architectureGuard', 'apps/web/src/app/services/runs/runsApiSnapshotMapper.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/services/runs/runsApiSnapshotMapper.test.ts')
      ),
      jsonb_build_object(
        'name', 'toFocusedRunModel',
        'path', 'apps/web/src/app/views/RunsView.tsx',
        'dddOwner', 'SYS-WEB-VIEWS-RUNS',
        'cqRails', jsonb_build_array('GetRunStatus'),
        'fowlerSignals', jsonb_build_array('presentation_model', 'mapper'),
        'architectureGuard', 'apps/web/src/app/views/RunsView.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/RunsView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'parseDateTime',
        'path', 'apps/web/src/app/views/runs/runOperationalTableModel.ts',
        'dddOwner', 'SYS-WEB-VIEWS-RUNS',
        'cqRails', jsonb_build_array('ListRuns'),
        'fowlerSignals', jsonb_build_array('presentation_model', 'pure_function'),
        'architectureGuard', 'apps/web/src/app/views/runs/runOperationalTableModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/runs/runOperationalTableModel.test.ts')
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check',
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
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

update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = rail.symbol_refs || jsonb_build_array(
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts#toPublicWarehouseConnection'
  ),
  implementation_refs = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        rail.implementation_refs || jsonb_build_array(
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
          'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql'
        )
      ) value(ref)
    ) refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        rail.allowed_implementation_surfaces || jsonb_build_array(
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
          'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql'
        )
      ) value(ref)
    ) refs
  ),
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'name', 'toPublicWarehouseConnection',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
        'dddOwner', 'SYS-API-INFRA-WAREHOUSE-SOURCES',
        'cqRails', jsonb_build_array('ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('data_mapper', 'security_boundary', 'allow_list'),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts'
        )
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql',
  source_content_sha256 = repeat(md5('ListWarehouseConnections:public-projection:795'), 2),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_id =
  'local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#query#listwarehouseconnections'
  and not coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) @> jsonb_build_array(
    jsonb_build_object(
      'name', 'toPublicWarehouseConnection',
      'path', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts'
    )
  );

update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = rail.symbol_refs || jsonb_build_array(
    'apps/web/cypress/support/canvasExecutionSelection.ts#filterVisibleCanvasNodes'
  ),
  implementation_refs = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        rail.implementation_refs || jsonb_build_array(
          'apps/web/cypress/support/canvasExecutionSelection.ts',
          'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql'
        )
      ) value(ref)
    ) refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        rail.allowed_implementation_surfaces || jsonb_build_array(
          'apps/web/cypress/support/canvasExecutionSelection.ts',
          'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql'
        )
      ) value(ref)
    ) refs
  ),
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'name', 'filterVisibleCanvasNodes',
        'path', 'apps/web/cypress/support/canvasExecutionSelection.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('ResolveVisibleCanvasNode'),
        'fowlerSignals', jsonb_build_array('test_adapter', 'pure_filter'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
        )
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/795_run_operational_truth_feature_mechanization.sql',
  source_content_sha256 = repeat(md5('ResolveVisibleCanvasNode:visible-filter:795'), 2),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_id =
  'local#E-CANVAS-WORKFLOW-E2E-USABILITY-20260601#query#resolvevisiblecanvasnode'
  and not coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) @> jsonb_build_array(
    jsonb_build_object(
      'name', 'filterVisibleCanvasNodes',
      'path', 'apps/web/cypress/support/canvasExecutionSelection.ts'
    )
  );

do $$
declare
  expected_symbols text[] := array[
    'GetRunStatusResult',
    'RunListItemDto',
    'RunOperationalTruthDto',
    'RUN_STATUS_READ_CONCURRENCY',
    'ProjectRunOperationalTruthInput',
    'RunOperationalTruthEvidence',
    'deriveDurationMs',
    'projectRunOperationalTruth',
    'UiRunStatus',
    'RUNS_LIST_STATUS_REFRESH_INTERVAL_MS',
    'RUN_DETAIL_STATUS_REFRESH_INTERVAL_MS',
    'isActiveRunStatus',
    'asFiniteNumber',
    'toFocusedRunModel',
    'parseDateTime',
    'toPublicWarehouseConnection',
    'filterVisibleCanvasNodes'
  ];
  declared_symbol_count integer;
begin
  select count(distinct symbol.value ->> 'name')
  into declared_symbol_count
  from planning_query_store.feature_mechanization_local_rails rail
  cross join lateral jsonb_array_elements(
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
  ) symbol(value)
  where symbol.value ->> 'name' = any(expected_symbols);

  if declared_symbol_count <> cardinality(expected_symbols) then
    raise exception 'Run operational truth mechanization is incomplete: % of % symbols',
      declared_symbol_count,
      cardinality(expected_symbols);
  end if;

  if exists (
    select 1
    from planning_query_store.command_query_rail_query
    where lower(rail_name) in (
      'listruns',
      'getrunstatus',
      'listwarehouseconnections',
      'resolvevisiblecanvasnode'
    )
      and is_duplicate
  ) then
    raise exception 'Run operational truth mechanization introduced a duplicate command/query rail';
  end if;
end
$$;
