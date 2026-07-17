-- Reconcile the complete DBT execution-selection slice to one relational file
-- role per component path. Migration 713 is immutable after application.

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts'
  and file_role = 'query-model';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasAuthoringRuntime.types.ts', 'runtime-contract', 'UseCanvasAuthoringRuntimeArgs', jsonb_build_object('ownership', 'consumed', 'purpose', 'carry selection mode into authoring state'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:authoring-runtime-contract:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasAuthoringState.ts', 'scope-compositor', 'deriveCanvasAuthoringState', jsonb_build_object('ownership', 'consumed', 'purpose', 'compose requested, visible, and UI scopes'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:authoring-state:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasAuthoringState.test.ts', 'scope-compositor-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:authoring-state-test:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasExecutionActions.types.ts', 'execution-contract', 'UseCanvasExecutionActionsParams', jsonb_build_object('ownership', 'consumed', 'purpose', 'carry selection mode into preview and readiness'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:execution-contract:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts', 'file-preview-command-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:file-preview-test:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts', 'readiness-projection-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:readiness-test:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasController.test.mockWiring.ts', 'controller-test-adapter', 'setupUseCanvasControllerMocks', jsonb_build_object('ownership', 'evidence-support'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:controller-test-adapter:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasController.test.stateFactory.ts', 'controller-state-fixture', 'createUseCanvasControllerState', jsonb_build_object('ownership', 'evidence-support'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:controller-state-fixture:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx', 'presentation-adapter-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:presentation-adapter-test:714')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx', 'execution-test-harness', 'renderUseCanvasExecutionActions', jsonb_build_object('ownership', 'evidence-support'), 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql', md5('selection:execution-test-harness:714'))
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:file-ownership:714'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  source_path = 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:file-ownership:714'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

do $$
declare
  mapped_slice_file_count integer;
  duplicate_file_role_count integer;
begin
  select count(distinct file_path) into mapped_slice_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and file_path in (
      'apps/web/src/app/stores/canvasInteractionStore.test.ts',
      'apps/web/src/app/stores/canvasInteractionStore.ts',
      'apps/web/src/app/types/canvasExecutionSelection.ts',
      'apps/web/src/app/views/canvas/canvasAuthoringRuntime.types.ts',
      'apps/web/src/app/views/canvas/canvasAuthoringState.test.ts',
      'apps/web/src/app/views/canvas/canvasAuthoringState.ts',
      'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts',
      'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts',
      'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts',
      'apps/web/src/app/views/canvas/canvasDraftScope.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftScope.ts',
      'apps/web/src/app/views/canvas/canvasExecutionActions.types.ts',
      'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasExecutionState.ts',
      'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts',
      'apps/web/src/app/views/canvas/canvasPlanAction.ts',
      'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
      'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
      'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
      'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts',
      'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts',
      'apps/web/src/app/views/canvas/useCanvasAuthoringRuntime.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.mockWiring.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.stateFactory.ts',
      'apps/web/src/app/views/canvas/useCanvasController.ts',
      'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.ts',
      'apps/web/src/app/views/canvas/useCanvasPlanActionHandler.ts',
      'apps/web/src/app/views/canvas/useCanvasStoreFacade.ts',
      'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts',
      'apps/web/src/app/views/canvas/useDbtProjectFileExecution.ts'
    );

  select count(*) into duplicate_file_role_count
  from (
    select file_path
    from planning_query_store.frontend_component_local_files
    where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    group by file_path
    having count(*) > 1
  ) duplicates;

  if mapped_slice_file_count <> 33 then
    raise exception 'Canvas execution-selection slice requires 33 mapped Web files, found %', mapped_slice_file_count;
  end if;

  if duplicate_file_role_count <> 0 then
    raise exception 'Canvas execution-selection component has % paths with duplicate roles', duplicate_file_role_count;
  end if;
end $$;
