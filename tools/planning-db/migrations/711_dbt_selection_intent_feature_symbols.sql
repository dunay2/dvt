-- Keep the DB-first feature manifest mechanically complete for every symbol
-- introduced by the DBT selection-intent integrity slice.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#DBT_EXECUTION_SCOPE_REJECTION',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#DBT_EXECUTABLE_STEP_KIND_BY_NODE_KIND',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#DbtExecutionScopeResolution',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#resolveDbtExecutableStepKind',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#isDbtExecutionSelectableNode',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#canOfferDbtExecutionSelectionToggle',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#resolveDbtExecutionScope',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts#DbtPreviewExecutionStrategy',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts#buildCanvasDbtExecutionProjection',
    'apps/web/src/app/views/canvas/canvasPlanAction.ts#attachDbtSelectionIntent',
    'apps/web/src/app/types/plans.ts#PlanPreviewSelectionIntentViewModel',
    'apps/web/src/app/components/Modals.tsx#PlanPreviewSelectionReview',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts#SOURCE_UNIQUE_ID',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts#SUMMARY_MODEL_UNIQUE_ID',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts#selectResourceForExecution',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts#visitProjectWithRequestObservations'
  ),
  implementation_refs = implementation_refs || jsonb_build_array(
    'apps/web/src/app/types/plans.ts',
    'tools/planning-db/migrations/710_dbt_selection_recovery_affordance.sql',
    'tools/planning-db/migrations/711_dbt_selection_intent_feature_symbols.sql'
  ),
  allowed_implementation_surfaces = allowed_implementation_surfaces || jsonb_build_array(
    'apps/web/src/app/types/plans.ts',
    'tools/planning-db/migrations/710_dbt_selection_recovery_affordance.sql',
    'tools/planning-db/migrations/711_dbt_selection_intent_feature_symbols.sql'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      raw_manifest,
      '{allowedImplementationSurfaces}',
      coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb) || jsonb_build_array(
        'apps/web/src/app/types/plans.ts',
        'tools/planning-db/migrations/710_dbt_selection_recovery_affordance.sql',
        'tools/planning-db/migrations/711_dbt_selection_intent_feature_symbols.sql'
      )
    ),
    '{symbols}',
    jsonb_build_array(
      jsonb_build_object('name', 'DBT_EXECUTION_SCOPE_REJECTION', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts')),
      jsonb_build_object('name', 'DBT_EXECUTABLE_STEP_KIND_BY_NODE_KIND', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts', 'canvasDbtPlannerGraphSource.test.ts')),
      jsonb_build_object('name', 'DbtExecutionScopeResolution', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts')),
      jsonb_build_object('name', 'resolveDbtExecutableStepKind', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts', 'canvasDbtPlannerGraphSource.test.ts')),
      jsonb_build_object('name', 'isDbtExecutionSelectableNode', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('useCanvasControllerReadModel.test.tsx')),
      jsonb_build_object('name', 'canOfferDbtExecutionSelectionToggle', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts', 'useCanvasControllerReadModel.test.tsx')),
      jsonb_build_object('name', 'resolveDbtExecutionScope', 'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('boundary drift', 'duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts')),
      jsonb_build_object('name', 'DbtPreviewExecutionStrategy', 'path', 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection', 'PreviewExecutionPlan', 'ObservePlanRunReadiness'), 'fowlerSignals', jsonb_build_array('divergent change'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('canvasPlanAction.dbtProjectFiles.test.ts', 'canvasPlanReadiness.test.ts')),
      jsonb_build_object('name', 'buildCanvasDbtExecutionProjection', 'path', 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts', 'dddOwner', 'CanvasExecutionSelection', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection', 'PreviewExecutionPlan', 'ObservePlanRunReadiness'), 'fowlerSignals', jsonb_build_array('divergent change', 'duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('canvasPlanAction.dbtProjectFiles.test.ts', 'canvasPlanReadiness.test.ts')),
      jsonb_build_object('name', 'attachDbtSelectionIntent', 'path', 'apps/web/src/app/views/canvas/canvasPlanAction.ts', 'dddOwner', 'Execution Preview selection review', 'cqRails', jsonb_build_array('PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('data clump'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('canvasPlanAction.dbtProjectFiles.test.ts')),
      jsonb_build_object('name', 'PlanPreviewSelectionIntentViewModel', 'path', 'apps/web/src/app/types/plans.ts', 'dddOwner', 'Execution Preview selection review', 'cqRails', jsonb_build_array('PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('Modals.test.tsx')),
      jsonb_build_object('name', 'PlanPreviewSelectionReview', 'path', 'apps/web/src/app/components/Modals.tsx', 'dddOwner', 'Execution Preview selection review', 'cqRails', jsonb_build_array('PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('divergent change'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('Modals.test.tsx')),
      jsonb_build_object('name', 'SOURCE_UNIQUE_ID', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'dddOwner', 'CanvasExecutionSelection acceptance evidence', 'cqRails', jsonb_build_array('PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbt-project-preview-run-live.cy.ts')),
      jsonb_build_object('name', 'SUMMARY_MODEL_UNIQUE_ID', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'dddOwner', 'CanvasExecutionSelection acceptance evidence', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection', 'PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('boundary drift'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbt-project-preview-run-live.cy.ts')),
      jsonb_build_object('name', 'selectResourceForExecution', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'dddOwner', 'CanvasExecutionSelection acceptance evidence', 'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbt-project-preview-run-live.cy.ts')),
      jsonb_build_object('name', 'visitProjectWithRequestObservations', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'dddOwner', 'CanvasExecutionSelection acceptance evidence', 'cqRails', jsonb_build_array('PreviewExecutionPlan'), 'fowlerSignals', jsonb_build_array('duplicated conditional fragments'), 'architectureGuard', 'canvasExecutionSelection.architecture.test.ts', 'cypressCoverage', 'dbt-project-preview-run-live.cy.ts', 'unitTests', jsonb_build_array('dbt-project-preview-run-live.cy.ts'))
    )
  ),
  source_path = 'tools/planning-db/migrations/711_dbt_selection_intent_feature_symbols.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:selection-intent-symbols:711'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
declare
  manifest_symbol_count integer;
begin
  select jsonb_array_length(raw_manifest->'symbols') into manifest_symbol_count
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

  if manifest_symbol_count <> 16 then
    raise exception 'CollectCanvasExecutionSelection must declare sixteen implementation symbols, found %', manifest_symbol_count;
  end if;
end $$;
