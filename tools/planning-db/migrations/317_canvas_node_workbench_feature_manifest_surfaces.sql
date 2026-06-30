-- DB-first feature mechanization coverage for the NodeWorkbench metadata
-- projection slice. The guard reads feature_mechanization_local_rails, so this
-- row keeps fresh clones aligned without reintroducing Markdown as the write
-- surface.

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
  created_by,
  created_at,
  updated_at
)
values (
  'local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties',
  'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604',
  'implemented',
  'InspectCanvasNodeProperties',
  'inspectcanvasnodeproperties',
  'query',
  'CanvasNodeWorkbench',
  'implemented',
  jsonb_build_array(
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#toSourceNode',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#createCatalog',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#createDraftStore',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#createWorkspaceFiles',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#BuildDvtTransformColumnOptionsArgs',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#DvtTransformColumn',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#DvtTransformColumnOption',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#buildDvtTransformColumnOptions',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#isRecord',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readBoolean',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readColumns',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readDvtSelectedColumnRefs',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readMetadataConfig',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readString',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readStringArray',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildDvtTransformInputColumnRows',
    'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts#mapDbtNodeToCanonical',
    'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts#cloneMetadata'
  ),
  jsonb_build_array(
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#toSourceNode',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#createCatalog',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#createDraftStore',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#createWorkspaceFiles',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#BuildDvtTransformColumnOptionsArgs',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#DvtTransformColumn',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#DvtTransformColumnOption',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#buildDvtTransformColumnOptions',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#isRecord',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readBoolean',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readColumns',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readDvtSelectedColumnRefs',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readMetadataConfig',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readString',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readStringArray',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildDvtTransformInputColumnRows',
    'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts#mapDbtNodeToCanonical',
    'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts#cloneMetadata'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts',
    'apps/web/src/app/plugins/dbt/dbtNodeAdapter.test.ts',
    'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts',
    'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts',
    'apps/web/src/app/types/dbt.ts',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
    'tools/planning-db/migrations/315_canvas_node_workbench_source_metadata_projection.sql',
    'tools/planning-db/migrations/316_canvas_node_workbench_source_metadata_projection_dedupe.sql',
    'tools/planning-db/migrations/317_canvas_node_workbench_feature_manifest_surfaces.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts src/app/plugins/dbt/dbtNodeAdapter.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts src/app/plugins/dbt/dbtNodeAdapter.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm --filter dvt-api typecheck',
    'pnpm --filter dvt-api lint',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/317_canvas_node_workbench_feature_manifest_surfaces.sql',
  repeat('3', 64),
  jsonb_build_object(
    'name', 'InspectCanvasNodeProperties',
    'type', 'query',
    'dddOwner', 'CanvasNodeWorkbench',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md',
    'componentGuides',
      jsonb_build_array(
        'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
      ),
    'userStories',
      jsonb_build_array(
        'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md'
      ),
    'governingSources',
      jsonb_build_array(
        'AGENTS.md',
        'docs/planning/status/governance-document-rule-inventory.md',
        'docs/guides/ai-work-protocol.md',
        'docs/architecture/command-query-rail-governance.md',
        'docs/architecture/fowler-opportunity-planning-governance.md'
      ),
    'allowedImplementationSurfaces',
      jsonb_build_array(
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
        'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
        'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts',
        'apps/web/src/app/plugins/dbt/dbtNodeAdapter.test.ts',
        'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts',
        'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts',
        'apps/web/src/app/types/dbt.ts',
        'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
        'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'tools/planning-db/migrations/315_canvas_node_workbench_source_metadata_projection.sql',
        'tools/planning-db/migrations/316_canvas_node_workbench_source_metadata_projection_dedupe.sql',
        'tools/planning-db/migrations/317_canvas_node_workbench_feature_manifest_surfaces.sql'
      ),
    'forbiddenImplementationSurfaces',
      jsonb_build_array('docs/archive/**', 'buzon/**'),
    'domainObjects',
      jsonb_build_array(
        'NodePropertiesReadModel',
        'DvtTransformColumnOption',
        'WorkspaceGraphSnapshot',
        'DbtNode'
      ),
    'fowlerSignals',
      jsonb_build_array(
        'read_model',
        'published_language',
        'boundary_drift'
      ),
    'architectureGuards',
      jsonb_build_array(
        'pnpm docs:feature-mechanization:implementation',
        'pnpm planning:db:integrity:check'
      ),
    'cypressFlows',
      jsonb_build_array('N/A - read model and metadata projection slice'),
    'completionGate',
      jsonb_build_array(
        'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts src/app/plugins/dbt/dbtNodeAdapter.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts',
        'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
        'pnpm --filter @dvt/web typecheck',
        'pnpm --filter @dvt/web lint',
        'pnpm --filter dvt-api typecheck',
        'pnpm --filter dvt-api lint',
        'pnpm planning:db:integrity:check',
        'pnpm docs:feature-mechanization:implementation',
        'pnpm verify:prepush'
      ),
    'commandQueryRails',
      jsonb_build_array(
        jsonb_build_object(
          'name', 'InspectCanvasNodeProperties',
          'type', 'query',
          'dddOwner', 'CanvasNodeWorkbench',
          'status', 'implemented'
        )
      ),
    'redGreenCycles',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'inspectcanvasnodeproperties-source-metadata-projection',
          'redTest',
            'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts src/app/plugins/dbt/dbtNodeAdapter.test.ts',
          'expectedFailure',
            'DBT source/runtime metadata is dropped before node cards and the NodeWorkbench can inspect it.',
          'patchSurfaces',
            jsonb_build_array(
              'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts',
              'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts',
              'apps/web/src/app/types/dbt.ts'
            ),
          'greenTest',
            'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts src/app/plugins/dbt/dbtNodeAdapter.test.ts'
        ),
        jsonb_build_object(
          'id', 'inspectcanvasnodeproperties-dvt-column-selection',
          'redTest',
            'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts',
          'expectedFailure',
            'DVT SQL transform nodes do not project connected source columns or selected column state into the properties read model.',
          'patchSurfaces',
            jsonb_build_array(
              'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
              'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'
            ),
          'greenTest',
            'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts'
        ),
        jsonb_build_object(
          'id', 'importwarehousesources-row-count-preservation',
          'redTest',
            'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
          'expectedFailure',
            'Imported source table row counts are dropped before persisting source-node metadata.',
          'patchSurfaces',
            jsonb_build_array(
              'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
              'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
            ),
          'greenTest',
            'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts'
        )
      ),
    'symbols',
      jsonb_build_array(
        jsonb_build_object('name', 'toSourceNode', 'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts', 'dddOwner', 'Warehouse source import', 'cqRails', jsonb_build_array('ImportWarehouseSources'), 'fowlerSignals', jsonb_build_array('read_model'), 'architectureGuard', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts', 'cypressCoverage', 'N/A - backend application service', 'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')),
        jsonb_build_object('name', 'createCatalog', 'path', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts', 'dddOwner', 'Warehouse source import test fixture', 'cqRails', jsonb_build_array('ImportWarehouseSources'), 'fowlerSignals', jsonb_build_array('semantic_test_fixture'), 'architectureGuard', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts', 'cypressCoverage', 'N/A', 'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')),
        jsonb_build_object('name', 'createDraftStore', 'path', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts', 'dddOwner', 'Warehouse source import test fixture', 'cqRails', jsonb_build_array('ImportWarehouseSources'), 'fowlerSignals', jsonb_build_array('semantic_test_fixture'), 'architectureGuard', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts', 'cypressCoverage', 'N/A', 'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')),
        jsonb_build_object('name', 'createWorkspaceFiles', 'path', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts', 'dddOwner', 'Warehouse source import test fixture', 'cqRails', jsonb_build_array('ImportWarehouseSources'), 'fowlerSignals', jsonb_build_array('semantic_test_fixture'), 'architectureGuard', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts', 'cypressCoverage', 'N/A', 'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')),
        jsonb_build_object('name', 'BuildDvtTransformColumnOptionsArgs', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('data_clump'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'DvtTransformColumn', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'DvtTransformColumnOption', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'buildDvtTransformColumnOptions', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('read_model'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'isRecord', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench metadata guard', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('replace_primitive_with_query_method'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'readBoolean', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench metadata reader', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('replace_primitive_with_query_method'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'readColumns', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench column reader', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('read_model'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'readDvtSelectedColumnRefs', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench selected-column reader', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('read_model'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'readMetadataConfig', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench metadata reader', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('replace_primitive_with_query_method'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'readString', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench metadata reader', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('replace_primitive_with_query_method'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'readStringArray', 'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts', 'dddOwner', 'CanvasNodeWorkbench metadata reader', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('replace_primitive_with_query_method'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')),
        jsonb_build_object('name', 'buildDvtTransformInputColumnRows', 'path', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts', 'dddOwner', 'CanvasNodeWorkbench properties read model', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('read_model'), 'architectureGuard', 'pnpm docs:feature-mechanization:implementation', 'cypressCoverage', 'N/A - read model', 'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts')),
        jsonb_build_object('name', 'mapDbtNodeToCanonical', 'path', 'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts', 'dddOwner', 'DBT graph adapter', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('adapter'), 'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/dbt/dbtNodeAdapter.test.ts', 'cypressCoverage', 'N/A - adapter projection', 'unitTests', jsonb_build_array('apps/web/src/app/plugins/dbt/dbtNodeAdapter.test.ts')),
        jsonb_build_object('name', 'cloneMetadata', 'path', 'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts', 'dddOwner', 'Workspace graph snapshot projection', 'cqRails', jsonb_build_array('GetWorkspaceGraphDraft', 'InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('read_model'), 'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts', 'cypressCoverage', 'N/A - snapshot projection', 'unitTests', jsonb_build_array('apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts'))
      )
  ),
  0,
  'codex',
  now(),
  now()
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision),
  updated_at = now();
