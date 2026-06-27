-- DB-first completion for Canvas live workflow proof symbols introduced while
-- hardening the protected Add Source, preview, and run browser proof.

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
values
(
  'local#E-CANVAS-WORKFLOW-E2E-USABILITY-20260601#query#resolveopensourceimportdialog',
  'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601',
  'implemented',
  'ResolveOpenSourceImportDialog',
  'resolveopensourceimportdialog',
  'query',
  'CanvasSourceImportDialogBrowserProof',
  'implemented',
  jsonb_build_array(
    'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts#getOpenSourceImportDialog'
  ),
  jsonb_build_array(
    'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts#getOpenSourceImportDialog',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
    'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
    'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.metadata.test.tsx',
    'pnpm --filter @dvt/web test:e2e:selected-closure:live',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.metadata.test.tsx',
    'pnpm --filter @dvt/web test:e2e:selected-closure:live',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql',
  md5('E-CANVAS-WORKFLOW-E2E-USABILITY-20260601:ResolveOpenSourceImportDialog:338')
    || md5('CanvasSourceImportDialogBrowserProof:getOpenSourceImportDialog'),
  jsonb_build_object(
    'name', 'ResolveOpenSourceImportDialog',
    'type', 'query',
    'dddOwner', 'CanvasSourceImportDialogBrowserProof',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Keep the live Canvas workflow proof anchored to the real visible Add Source dialog instead of detached or hidden dialog instances.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.CanvasSourceImportDialog',
      'docs/architecture/command-query-rail-governance.md'
    ),
    'userStories', jsonb_build_array(
      'As a reviewer, the live Canvas proof only operates on the visible Add Source dialog opened from the canvas context menu.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
      'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/archive/**',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasSourceImportDialog',
      'CanvasWorkflowLiveProof'
    ),
    'fowlerSignals', jsonb_build_array(
      'test_only_confidence',
      'hidden_state'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:e2e:selected-closure:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveOpenSourceImportDialog',
        'type', 'query',
        'dddOwner', 'CanvasSourceImportDialogBrowserProof',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'visible-source-import-dialog-proof-helper',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'The live proof helper getOpenSourceImportDialog is not declared in DB-first feature mechanization symbols.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'getOpenSourceImportDialog',
        'path', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'dddOwner', 'CanvasSourceImportDialogBrowserProof',
        'cqRails', jsonb_build_array('ResolveOpenSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('test_only_confidence', 'hidden_state'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.metadata.test.tsx'
        )
      )
    )
  ),
  0,
  'codex'
),
(
  'local#E-CANVAS-WORKFLOW-E2E-USABILITY-20260601#query#resolvevisiblecanvasnode',
  'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601',
  'implemented',
  'ResolveVisibleCanvasNode',
  'resolvevisiblecanvasnode',
  'query',
  'CanvasGraphBrowserProof',
  'implemented',
  jsonb_build_array(
    'apps/web/cypress/support/canvasExecutionSelection.ts#getVisibleCanvasNode'
  ),
  jsonb_build_array(
    'apps/web/cypress/support/canvasExecutionSelection.ts#getVisibleCanvasNode',
    'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/cypress/support/canvasExecutionSelection.ts',
    'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'pnpm --filter @dvt/web test:e2e:selected-closure:live',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'pnpm --filter @dvt/web test:e2e:selected-closure:live',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql',
  md5('E-CANVAS-WORKFLOW-E2E-USABILITY-20260601:ResolveVisibleCanvasNode:338')
    || md5('CanvasGraphBrowserProof:getVisibleCanvasNode'),
  jsonb_build_object(
    'name', 'ResolveVisibleCanvasNode',
    'type', 'query',
    'dddOwner', 'CanvasGraphBrowserProof',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Keep Canvas live proof node actions scoped to visible React Flow nodes so context menus and selection use the real graph surface.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.CanvasGraphSurface',
      'docs/architecture/command-query-rail-governance.md'
    ),
    'userStories', jsonb_build_array(
      'As a reviewer, node selection in the live proof targets visible graph nodes rather than hidden DOM echoes.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/support/canvasExecutionSelection.ts',
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
      'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/archive/**',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasGraphSurface',
      'CanvasWorkflowLiveProof'
    ),
    'fowlerSignals', jsonb_build_array(
      'test_only_confidence',
      'presentation_logic'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'pnpm --filter @dvt/web test:e2e:selected-closure:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveVisibleCanvasNode',
        'type', 'query',
        'dddOwner', 'CanvasGraphBrowserProof',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'visible-canvas-node-proof-helper',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'The Cypress helper getVisibleCanvasNode is not declared in DB-first feature mechanization symbols.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/cypress/support/canvasExecutionSelection.ts',
          'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'getVisibleCanvasNode',
        'path', 'apps/web/cypress/support/canvasExecutionSelection.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('ResolveVisibleCanvasNode'),
        'fowlerSignals', jsonb_build_array('test_only_confidence', 'presentation_logic'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
        )
      )
    )
  ),
  0,
  'codex'
),
(
  'local#E-CANVAS-WORKFLOW-E2E-USABILITY-20260601#command#adoptexternalcanvasdraftrevision',
  'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601',
  'implemented',
  'AdoptExternalCanvasDraftRevision',
  'adoptexternalcanvasdraftrevision',
  'command',
  'CanvasDraftSessionMachine',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#adoptExternalRevision'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#adoptExternalRevision',
    'apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
    'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'apps/web/src/app/ports/workspace.ts',
    'apps/api/src/application/ports/warehouseSourceImport.ts',
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
    'apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
    'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'apps/web/src/app/ports/workspace.ts',
    'apps/api/src/application/ports/warehouseSourceImport.ts',
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'pnpm --filter dvt-api exec vitest run test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'pnpm --filter dvt-api exec vitest run test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter dvt-api typecheck',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql',
  md5('E-CANVAS-WORKFLOW-E2E-USABILITY-20260601:AdoptExternalCanvasDraftRevision:338')
    || md5('CanvasDraftSessionMachine:adoptExternalRevision'),
  jsonb_build_object(
    'name', 'AdoptExternalCanvasDraftRevision',
    'type', 'command',
    'dddOwner', 'CanvasDraftSessionMachine',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'After ImportWarehouseSources writes through the protected API, Canvas adopts the returned draft revision so later autosave and preview commands do not collide with a stale local revision.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.CanvasDraftSessionMachine',
      'docs/architecture/command-query-rail-governance.md'
    ),
    'userStories', jsonb_build_array(
      'As a Canvas author, importing a real warehouse source updates the draft session revision immediately so subsequent preview/run flow does not hit stale-version conflicts.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
      'apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
      'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
      'apps/web/src/app/ports/workspace.ts',
      'apps/api/src/application/ports/warehouseSourceImport.ts',
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/archive/**',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasDraftSession',
      'WorkspaceGraphDraftRevision',
      'WarehouseSourceImportResult'
    ),
    'fowlerSignals', jsonb_build_array(
      'hidden_authority',
      'temporal_coupling'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
      'pnpm --filter dvt-api exec vitest run test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
      'pnpm --filter dvt-api exec vitest run test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter dvt-api typecheck',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'AdoptExternalCanvasDraftRevision',
        'type', 'command',
        'dddOwner', 'CanvasDraftSessionMachine',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'source-import-draft-revision-adoption',
        'redTest', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
        'expectedFailure', 'A source import that writes a newer draft revision leaves the local Canvas draft session stale and the next autosave/preview conflicts.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
          'apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts',
          'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
          'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
          'apps/web/src/app/ports/workspace.ts',
          'apps/api/src/application/ports/warehouseSourceImport.ts',
          'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
          'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
          'tools/planning-db/migrations/338_canvas_live_workflow_proof_symbol_completion.sql'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'adoptExternalRevision',
        'path', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
        'dddOwner', 'CanvasDraftSessionMachine',
        'cqRails', jsonb_build_array('AdoptExternalCanvasDraftRevision'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'temporal_coupling'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.sourceImport.test.tsx'
        )
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update
set
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
