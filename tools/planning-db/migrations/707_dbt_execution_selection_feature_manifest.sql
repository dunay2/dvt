-- Complete the existing DBT execution-selection feature manifest without
-- creating another feature or command/query rail.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#DBT_EXECUTION_SCOPE_REJECTION',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#DbtExecutionScopeResolution',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#resolveDbtExecutionScope',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts#DbtPreviewExecutionStrategy',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts#buildCanvasDbtExecutionProjection',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts#SOURCE_UNIQUE_ID',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts#selectResourceForExecution',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts#visitProjectWithRequestObservations'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts',
    'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts',
    'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts',
    'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts',
    'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts',
    'apps/web/src/app/views/canvas/canvasExecutionState.ts',
    'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
    'apps/web/src/app/views/canvas/canvasCopy.types.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.es.ts',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
    'apps/web/cypress/support/canvasExecutionSelection.ts',
    'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/web/graph/canvas-execution-selection-component.md'
  ),
  governing_sources = jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/web/graph/canvas-execution-selection-component.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts',
    'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts',
    'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts',
    'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts',
    'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts',
    'apps/web/src/app/views/canvas/canvasExecutionState.ts',
    'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
    'apps/web/src/app/views/canvas/canvasCopy.types.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.es.ts',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
    'apps/web/cypress/support/canvasExecutionSelection.ts',
    'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts',
    'docs/architecture/components/web/graph/canvas-execution-selection-component.md',
    'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql',
    'tools/planning-db/migrations/705_dbt_explicit_selection_live_evidence.sql',
    'tools/planning-db/migrations/706_dbt_execution_selection_validation_links.sql',
    'tools/planning-db/migrations/707_dbt_execution_selection_feature_manifest.sql'
  ),
  architecture_guards = jsonb_build_array(
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
    'pnpm --filter dvt-api exec vitest run test/application/services/resolveAuthorizedPreviewSelection.test.ts',
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  source_path = 'tools/planning-db/migrations/707_dbt_execution_selection_feature_manifest.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:feature-manifest:707'), 2),
  raw_manifest = jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-PROJECT-ROUNDTRIP-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Preserve explicit DBT selection intent through one shared readiness and Preview projection, and reject source-only selection again at server authority.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-execution-selection-component.md'
    ),
    'userStories', jsonb_build_array(
      'A workspace editor who selects only non-executable DBT resources is blocked with actionable guidance and Preview never widens to the whole project.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/components/web/graph/canvas-execution-selection-component.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
      'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
      'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts',
      'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts',
      'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts',
      'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts',
      'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts',
      'apps/web/src/app/views/canvas/canvasPlanAction.ts',
      'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts',
      'apps/web/src/app/views/canvas/canvasExecutionState.ts',
      'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
      'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasCopy.types.ts',
      'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.ts',
      'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.es.ts',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      'apps/web/cypress/support/canvasExecutionSelection.ts',
      'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts',
      'docs/architecture/components/web/graph/canvas-execution-selection-component.md',
      'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql',
      'tools/planning-db/migrations/705_dbt_explicit_selection_live_evidence.sql',
      'tools/planning-db/migrations/706_dbt_execution_selection_validation_links.sql',
      'tools/planning-db/migrations/707_dbt_execution_selection_feature_manifest.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'packages/@dvt/contracts/** contract changes are not required for an existing selection contract',
      'apps/api/src/** client policy must not replace independent server authorization',
      'apps/web/src/app/stores/** selection semantics must not create another state authority'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'CollectCanvasExecutionSelection', 'type', 'query', 'dddOwner', 'CanvasExecutionSelection'),
      jsonb_build_object('name', 'PreviewExecutionPlan', 'type', 'command', 'dddOwner', 'Execution Plan'),
      jsonb_build_object('name', 'ObservePlanRunReadiness', 'type', 'query', 'dddOwner', 'PlanRunReadinessReadModel')
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object('name', 'CanvasExecutionSelection', 'type', 'query model', 'owner', 'Canvas execution selection'),
      jsonb_build_object('name', 'DbtExecutionScopeResolution', 'type', 'policy result', 'owner', 'Canvas execution selection')
    ),
    'fowlerSignals', jsonb_build_array(
      'boundary drift',
      'duplicated conditional fragments',
      'divergent change'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'canvasExecutionSelection.architecture.test.ts',
        'command', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasExecutionSelection.architecture.test.ts'
      ),
      jsonb_build_object(
        'name', 'resolveAuthorizedPreviewSelection.test.ts',
        'command', 'pnpm --filter dvt-api exec vitest run test/application/services/resolveAuthorizedPreviewSelection.test.ts'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'dbt-project-preview-run-live.cy.ts',
        'command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'explicit-dbt-selection-policy',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
        'expectedFailure', 'A source-only explicit selection widened to all executable workspace nodes.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
          'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/dbtExecutionScopePolicy.test.ts'
      ),
      jsonb_build_object(
        'id', 'source-only-browser-preview',
        'redTest', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
        'expectedFailure', 'The browser enabled Preview and posted /plans/preview after selecting only a DBT source.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasPlanAction.ts',
          'apps/web/src/app/views/canvas/canvasExecutionState.ts',
          'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
        ),
        'greenTest', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object('name', 'DBT_EXECUTION_SCOPE_REJECTION', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts')),
      jsonb_build_object('name', 'DbtExecutionScopeResolution', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts')),
      jsonb_build_object('name', 'resolveDbtExecutionScope', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift', 'duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts')),
      jsonb_build_object('name', 'DbtPreviewExecutionStrategy', 'path', 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection', 'PreviewExecutionPlan', 'ObservePlanRunReadiness'), 'fowlerSignals', jsonb_build_array('divergent change'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('canvasPlanAction.dbtProjectFiles.test.ts', 'canvasPlanReadiness.test.ts')),
      jsonb_build_object('name', 'buildCanvasDbtExecutionProjection', 'path', 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection', 'PreviewExecutionPlan', 'ObservePlanRunReadiness'), 'fowlerSignals', jsonb_build_array('divergent change', 'duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('canvasPlanAction.dbtProjectFiles.test.ts', 'canvasPlanReadiness.test.ts')),
      jsonb_build_object('name', 'SOURCE_UNIQUE_ID', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'dddOwner', 'CanvasExecutionSelection acceptance evidence', 'cqRails', jsonb_build_array('PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbt-project-preview-run-live.cy.ts')),
      jsonb_build_object('name', 'selectResourceForExecution', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'dddOwner', 'CanvasExecutionSelection acceptance evidence', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbt-project-preview-run-live.cy.ts')),
      jsonb_build_object('name', 'visitProjectWithRequestObservations', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'dddOwner', 'CanvasExecutionSelection acceptance evidence', 'cqRails', jsonb_build_array('PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbt-project-preview-run-live.cy.ts'))
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
declare
  manifest jsonb;
begin
  select raw_manifest into manifest
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

  if manifest is null then
    raise exception 'CollectCanvasExecutionSelection feature manifest is missing';
  end if;

  if jsonb_array_length(manifest->'symbols') <> 8 then
    raise exception 'CollectCanvasExecutionSelection must declare eight added symbols';
  end if;

  if not (manifest ?& array[
    'componentGuides', 'governingSources', 'forbiddenImplementationSurfaces',
    'fowlerSignals', 'architectureGuards', 'cypressFlows', 'redGreenCycles', 'symbols'
  ]) then
    raise exception 'CollectCanvasExecutionSelection feature manifest is incomplete';
  end if;
end $$;
