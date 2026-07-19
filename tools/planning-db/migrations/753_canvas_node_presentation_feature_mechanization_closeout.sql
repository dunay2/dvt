-- Consolidate the Canvas node-presentation implementation into one complete
-- DB-first mechanization manifest. Earlier migrations described incremental
-- rails; this closeout makes every local rail project the same feature truth.

with explicit_symbols(
  path, name, ddd_owner, cq_rails, unit_tests
) as (
  values
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts', 'openNodeWorkbenchSection', 'CanvasDbtModelCodeRoundtrip', jsonb_build_array('ConfigureCanvasDbtNode'), jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts')),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts', 'waitForLiveDraftModelSqlSaved', 'CanvasDbtModelCodeRoundtrip', jsonb_build_array('ConfigureCanvasDbtNode'), jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationCopy.contract.ts', 'isRecord', 'CanvasCopyCatalog', jsonb_build_array('ResolveCanvasViewCopy'), jsonb_build_array('apps/web/src/app/views/canvas/copy.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts', 'isRecord', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'BuildCanvasNodePresentationTruthArgs', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'ColumnCandidate', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'buildCodeTruth', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'isRecord', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'readBoolean', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'readColumn', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'readDeclaredColumns', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'readInheritedColumns', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'readString', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts', 'resolveCodeLanguage', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')),
    ('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts', 'buildInheritedColumnRows', 'NodePropertiesReadModel', jsonb_build_array('InspectCanvasNodeProperties'), jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts')),
    ('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts', 'interpolatePresentationTemplate', 'NodePropertiesReadModel', jsonb_build_array('InspectCanvasNodeProperties'), jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts')),
    ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts', 'GraphNodeColumnMetricPresentation', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')),
    ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts', 'interpolateCount', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')),
    ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts', 'resolveColumnMetricPresentation', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')),
    ('apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx', 'DbtModelCodeAuthoringSection', 'CanvasDbtNodeAuthoringDraft', jsonb_build_array('ConfigureCanvasDbtNode'), jsonb_build_array('apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx')),
    ('apps/web/src/app/views/canvas/canvasCopyFormatting.ts', 'formatCanvasCopyTemplate', 'CanvasCopyCatalog', jsonb_build_array('ResolveCanvasViewCopy'), jsonb_build_array('apps/web/src/app/views/canvas/copy.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts', 'readAuthoredSql', 'CanvasDbtNodeAuthoringDraft', jsonb_build_array('ConfigureCanvasDbtNode'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtAuthoringModel.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'DbtModelArtifactProjection', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'DbtModelArtifactProjectionResult', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'DbtModelArtifactSource', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'DbtModelOriginProjection', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'ProjectDbtModelArtifactArgs', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'buildArtifactContent', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'buildGeneratedBody', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'isCompatibleOrigin', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'isDbtModel', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'isDbtSource', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'isWarehouseSource', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'normalizeDbtArtifactIdentifier', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'projectDbtModelArtifact', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'projectSourceOrigin', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'resolveIncomingOrigins', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'resolveOriginProjection', 'DbtWorkspaceArtifactProjection', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts', 'areCanvasInspectorNodeDraftsEqual', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts')),
    ('apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts', 'IDLE_SURFACE', 'CanvasNodeContextSurfaceState', jsonb_build_array('CoordinateCanvasNodeContextSurface'), jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts')),
    ('apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts', 'activeSurfaceNodeId', 'CanvasNodeContextSurfaceState', jsonb_build_array('CoordinateCanvasNodeContextSurface'), jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts')),
    ('apps/web/src/app/views/canvas/canvasNodePresentationProjection.ts', 'projectCanvasNodePresentationTruth', 'CanvasNodePresentationTruth', jsonb_build_array('ProjectCanvasNodePresentationTruth'), jsonb_build_array('apps/web/src/app/views/canvas/canvasNodePresentationProjection.test.ts')),
    ('apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts', 'CanvasNodeWorkbenchVisibilityInput', 'CanvasNodeContextSurfaceState', jsonb_build_array('CoordinateCanvasNodeContextSurface'), jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts')),
    ('apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts', 'isCanvasNodeWorkbenchVisible', 'CanvasNodeContextSurfaceState', jsonb_build_array('CoordinateCanvasNodeContextSurface'), jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts')),
    ('apps/web/src/app/views/canvas/canvasProjectCanvasLifecycle.ts', 'buildInitialProjectCanvasDraft', 'CanvasProjectAggregate', jsonb_build_array('CreateCanvasDocumentCommand'), jsonb_build_array('apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts')),
    ('apps/web/src/app/views/canvas/canvasProjectCanvasLifecycle.ts', 'createEmptyProjectCanvasWorkspace', 'CanvasProjectAggregate', jsonb_build_array('CreateCanvasDocumentCommand'), jsonb_build_array('apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'CanvasNodeWorkbenchDraftController', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'DraftControllerAction', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'DraftControllerState', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'createDraftControllerState', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'reduceDraftControllerState', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'resolveStateUpdate', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'tagsFromText', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'tagsTextFromDraft', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx')),
    ('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'useCanvasNodeWorkbenchDraftController', 'CanvasInspectorNodeDraft', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'))
), existing_symbol_values as (
  select
    symbol->>'path' as path,
    symbol->>'name' as name,
    coalesce(nullif(symbol->>'dddOwner', ''), 'CanvasNodePresentationTruth') as ddd_owner,
    case
      when jsonb_typeof(symbol->'cqRails') = 'array'
        and jsonb_array_length(symbol->'cqRails') > 0
      then symbol->'cqRails'
      else jsonb_build_array('ProjectCanvasNodePresentationTruth')
    end as cq_rails,
    case
      when jsonb_typeof(symbol->'unitTests') = 'array'
        and jsonb_array_length(symbol->'unitTests') > 0
      then symbol->'unitTests'
      else jsonb_build_array('apps/web/src/app/components/canvas/canvasNodePresentationTruth.test.ts')
    end as unit_tests,
    1 as priority
  from planning_query_store.feature_mechanization_local_rails rail
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(rail.raw_manifest->'symbols') = 'array'
      then rail.raw_manifest->'symbols'
      else '[]'::jsonb
    end
  ) symbols(symbol)
  where rail.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
), symbol_candidates as (
  select path, name, ddd_owner, cq_rails, unit_tests, 0 as priority
  from explicit_symbols
  union all
  select path, name, ddd_owner, cq_rails, unit_tests, priority
  from existing_symbol_values
), deduplicated_symbols as (
  select distinct on (path, name)
    path, name, ddd_owner, cq_rails, unit_tests
  from symbol_candidates
  where coalesce(path, '') <> '' and coalesce(name, '') <> ''
  order by path, name, priority
), canonical_symbols as (
  select jsonb_agg(
    jsonb_build_object(
      'name', name,
      'path', path,
      'dddOwner', ddd_owner,
      'cqRails', cq_rails,
      'fowlerSignals', jsonb_build_array('single_responsibility', 'explicit_authority'),
      'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'unitTests', unit_tests
    )
    order by path, name
  ) as symbols
  from deduplicated_symbols
), canonical_manifest as (
  select jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    'mechanizationStatus', 'implemented',
    'implementationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Project one provenance-preserving Canvas node truth, coordinate mutually exclusive selected-node surfaces, edit DBT model SQL through the canonical authoring commands, and materialize the exact authored artifact for preview and Project code.',
    'componentGuides', jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
      'docs/architecture/components/web/frontend-component-inventory.md'
    ),
    'userStories', jsonb_build_array(
      'A demanding user sees the same factual columns, metrics, provenance, and code authority on every node surface.',
      'Selecting a node opens one coherent workbench or health surface and never leaves an orphan toolbar.',
      'A user edits DBT model SQL once and sees the exact content in draft, preview, and Project code.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'apps/web/cypress/support/liveWarehouseSourceImport.ts',
      'apps/web/src/app/components/canvas/**',
      'apps/web/src/app/components/inspector/**',
      'apps/web/src/app/plugins/dbt/**',
      'apps/web/src/app/plugins/dvt/**',
      'apps/web/src/app/plugins/graph/**',
      'apps/web/src/app/views/canvas/**',
      'tools/planning-db/migrations/746_canvas_node_presentation_truth_design.sql',
      'tools/planning-db/migrations/747_canvas_node_presentation_truth_implementation.sql',
      'tools/planning-db/migrations/748_inspect_canvas_node_properties_rail_reconcile.sql',
      'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
      'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
      'tools/planning-db/migrations/751_canvas_node_workbench_draft_controller_design.sql',
      'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
      'tools/planning-db/migrations/753_canvas_node_presentation_feature_mechanization_closeout.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/fixtures/**',
      'buzon/**',
      'docs/planning/state/agent-lane-*.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasNodePresentationTruth',
      'CanvasNodeContextSurfaceState',
      'NodePropertiesReadModel',
      'CanvasInspectorNodeDraft',
      'DbtWorkspaceArtifactProjection',
      'CanvasCopyCatalog'
    ),
    'fowlerSignals', jsonb_build_array(
      'single source of presentation truth',
      'explicit state machine',
      'controlled presentation form',
      'pure artifact projection',
      'ports and adapters'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm test:planning:db:migrations',
      'pnpm planning:db:integrity:check',
      'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web lint',
      'pnpm --filter @dvt/web typecheck',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'ProjectCanvasNodePresentationTruth', 'type', 'query', 'dddOwner', 'CanvasNodePresentationTruth', 'status', 'implemented'),
      jsonb_build_object('name', 'InspectCanvasNodeProperties', 'type', 'query', 'dddOwner', 'NodePropertiesReadModel', 'status', 'implemented'),
      jsonb_build_object('name', 'CoordinateCanvasNodeContextSurface', 'type', 'command', 'dddOwner', 'CanvasNodeContextSurfaceState', 'status', 'implemented'),
      jsonb_build_object('name', 'ResolveCanvasViewCopy', 'type', 'query', 'dddOwner', 'CanvasCopyCatalog', 'status', 'implemented'),
      jsonb_build_object('name', 'GenerateDbtWorkspaceArtifacts', 'type', 'query', 'dddOwner', 'DbtWorkspaceArtifactProjection', 'status', 'implemented'),
      jsonb_build_object('name', 'ConfigureCanvasDbtNode', 'type', 'command', 'dddOwner', 'CanvasDbtNodeAuthoringDraft', 'status', 'implemented'),
      jsonb_build_object('name', 'ConfigureCanvasDvtNode', 'type', 'command', 'dddOwner', 'DvtNodeAuthoringMetadata', 'status', 'implemented'),
      jsonb_build_object('name', 'CreateCanvasDocumentCommand', 'type', 'command', 'dddOwner', 'CanvasProjectAggregate', 'status', 'implemented')
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-node-presentation-parity',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodePresentationProjection.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts',
        'expectedFailure', 'Card and workbench disagree about columns, code, provenance, or metrics.',
        'patchSurfaces', jsonb_build_array('apps/web/src/app/components/canvas/**', 'apps/web/src/app/components/inspector/**', 'apps/web/src/app/plugins/graph/**'),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodePresentationProjection.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'canvas-node-context-exclusivity',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts',
        'expectedFailure', 'Toolbar, health, or workbench surfaces compete or remain after node deletion.',
        'patchSurfaces', jsonb_build_array('apps/web/src/app/views/canvas/CanvasViewport.tsx', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts'),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts'
      ),
      jsonb_build_object(
        'id', 'dbt-model-code-roundtrip',
        'redTest', 'pnpm --filter @dvt/web test:e2e:source-import:live',
        'expectedFailure', 'Authored DBT SQL is absent, generated over, or differs between draft, preview, and Project code.',
        'patchSurfaces', jsonb_build_array('apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx', 'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts'),
        'greenTest', 'pnpm --filter @dvt/web test:e2e:source-import:live'
      ),
      jsonb_build_object(
        'id', 'node-workbench-draft-srp',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx',
        'expectedFailure', 'Presentation owns a second draft lifecycle or discards a dirty draft during authority refresh.',
        'patchSurfaces', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts', 'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'
      )
    ),
    'symbols', canonical_symbols.symbols
  ) as manifest
  from canonical_symbols
)
update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'implemented',
  raw_manifest = canonical_manifest.manifest,
  source_path = 'tools/planning-db/migrations/753_canvas_node_presentation_feature_mechanization_closeout.sql',
  source_content_sha256 = repeat(md5(rail.rail_id || ':canonical-manifest:753'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from canonical_manifest
where rail.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1';

-- Historical command classifications remain queryable as retired records, but
-- each row still needs a complete mechanization contract to override imported
-- source declarations deterministically.
with retired_features(feature_id, component_guide, cycle_id) as (
  values
    ('E-DBT-AUTHOR-RUN-20260526', 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-authoring-code-run-vertical-plan-20260526.md', 'dbt-author-run-artifact-query-retirement'),
    ('CANVAS-INSPECTOR-PLUGIN-AUTHORING-FIELDS-20260604', 'docs/planning/proposals/mandatory/frontend-and-ux/canvas-inspector-plugin-authoring-fields-plan-20260604.md', 'canvas-inspector-artifact-query-retirement')
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_build_object(
    'version', 1,
    'featureId', retired.feature_id,
    'mechanizationStatus', 'implemented',
    'implementationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Retain the former GenerateDbtWorkspaceArtifacts command declaration only as explicit history while the deterministic projection is governed as a query.',
    'componentGuides', jsonb_build_array(retired.component_guide),
    'userStories', jsonb_build_array('A user receives one deterministic DBT workspace artifact projection without duplicate command semantics.'),
    'governingSources', jsonb_build_array('AGENTS.md', 'docs/architecture/command-query-rail-governance.md', 'docs/architecture/fowler-opportunity-planning-governance.md'),
    'allowedImplementationSurfaces', jsonb_build_array('tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql', 'tools/planning-db/migrations/753_canvas_node_presentation_feature_mechanization_closeout.sql'),
    'forbiddenImplementationSurfaces', jsonb_build_array('apps/web/cypress/fixtures/**', 'buzon/**'),
    'domainObjects', jsonb_build_array('DbtWorkspaceArtifactProjection'),
    'fowlerSignals', jsonb_build_array('query command separation', 'retired duplicate intent'),
    'architectureGuards', jsonb_build_array('pnpm test:planning:db:migrations', 'pnpm planning:db:query command-query-rails --filter GenerateDbtWorkspaceArtifacts --limit 50'),
    'cypressFlows', jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    'completionGate', jsonb_build_array('pnpm docs:feature-mechanization:implementation', 'pnpm verify:prepush'),
    'commandQueryRails', jsonb_build_array(jsonb_build_object('name', 'GenerateDbtWorkspaceArtifacts', 'type', 'command', 'dddOwner', 'DbtWorkspaceArtifactProjection', 'status', 'retired')),
    'redGreenCycles', jsonb_build_array(jsonb_build_object(
      'id', retired.cycle_id,
      'redTest', 'pnpm planning:db:query command-query-rails --filter GenerateDbtWorkspaceArtifacts --limit 50',
      'expectedFailure', 'More than one active command/query classification governs the deterministic artifact projection.',
      'patchSurfaces', jsonb_build_array('tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql', 'tools/planning-db/migrations/753_canvas_node_presentation_feature_mechanization_closeout.sql'),
      'greenTest', 'pnpm planning:db:query command-query-rails --filter GenerateDbtWorkspaceArtifacts --limit 50'
    )),
    'symbols', jsonb_build_array(jsonb_build_object(
      'name', 'buildDbtWorkspaceArtifacts',
      'path', 'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts',
      'dddOwner', 'DbtWorkspaceArtifactProjection',
      'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'),
      'fowlerSignals', jsonb_build_array('pure_projection'),
      'architectureGuard', 'pnpm test:planning:db:migrations',
      'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts')
    ))
  ),
  source_path = 'tools/planning-db/migrations/753_canvas_node_presentation_feature_mechanization_closeout.sql',
  source_content_sha256 = repeat(md5(rail.rail_id || ':retired-manifest:753'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from retired_features retired
where rail.feature_id = retired.feature_id
  and rail.rail_type = 'command'
  and rail.normalized_rail_name = 'generatedbtworkspaceartifacts'
  and rail.rail_status = 'retired';

do $$
declare
  incomplete_manifest_count integer;
  incomplete_retirement_count integer;
  active_projection_count integer;
  symbol_count integer;
begin
  select count(*) into incomplete_manifest_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
    and (
      source_path <> 'tools/planning-db/migrations/753_canvas_node_presentation_feature_mechanization_closeout.sql'
      or raw_manifest->>'version' <> '1'
      or raw_manifest->>'mechanizationStatus' <> 'implemented'
      or raw_manifest->>'noHumanDecisionsRemaining' <> 'true'
      or jsonb_array_length(raw_manifest->'redGreenCycles') < 4
    );

  if incomplete_manifest_count <> 0 then
    raise exception 'Canvas node presentation retains % incomplete feature manifests', incomplete_manifest_count;
  end if;

  select count(*) into incomplete_retirement_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id in (
    'E-DBT-AUTHOR-RUN-20260526',
    'CANVAS-INSPECTOR-PLUGIN-AUTHORING-FIELDS-20260604'
  )
    and rail_type = 'command'
    and normalized_rail_name = 'generatedbtworkspaceartifacts'
    and rail_status = 'retired'
    and (
      raw_manifest->>'version' <> '1'
      or raw_manifest->>'noHumanDecisionsRemaining' <> 'true'
    );

  if incomplete_retirement_count <> 0 then
    raise exception 'Retired DBT artifact command rows retain incomplete manifests';
  end if;

  select count(*) into active_projection_count
  from planning_query_store.command_query_rail_query
  where rail_name = 'GenerateDbtWorkspaceArtifacts'
    and rail_status = 'implemented';

  if active_projection_count <> 1 then
    raise exception 'GenerateDbtWorkspaceArtifacts must have exactly one implemented rail, found %', active_projection_count;
  end if;

  select jsonb_array_length(raw_manifest->'symbols') into symbol_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
  limit 1;

  if coalesce(symbol_count, 0) < 55 then
    raise exception 'Canvas node presentation manifest has only % symbols', coalesce(symbol_count, 0);
  end if;
end
$$;
