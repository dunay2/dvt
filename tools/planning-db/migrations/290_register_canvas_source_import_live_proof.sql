-- DB-first authority for the live contextual Add Source browser proof. The
-- browser flow must exercise the protected runtime and the real graph draft
-- read/write surfaces instead of proving success with local Cypress stubs.

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
  'local#E-CANVAS-ADD-SOURCE-LIVE-FLOW-1#command#attachwarehousesourcefromcanvascontext',
  'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
  'implemented',
  'AttachWarehouseSourceFromCanvasContext',
  'attachwarehousesourcefromcanvascontext',
  'command',
  'CanvasSourceImportDialog',
  'implemented',
  jsonb_build_array(
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#visitCleanDbtCanvas',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#waitForLiveDraftSaved',
    'scripts/run-canvas-source-import-live-proof.cjs#CanvasSourceImportLiveProofRunner',
    'scripts/run-canvas-source-import-live-proof.cjs#http',
    'scripts/run-canvas-source-import-live-proof.cjs#https',
    'scripts/run-canvas-source-import-live-proof.cjs#main',
    'scripts/run-canvas-source-import-live-proof.cjs#path',
    'scripts/run-canvas-source-import-live-proof.cjs#readline'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'apps/web/cypress/support/liveProtectedRuntime.ts',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
    'scripts/run-canvas-source-import-live-proof.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'apps/web/package.json',
    'package.json',
    'tools/planning-db/migrations/290_register_canvas_source_import_live_proof.sql'
  ),
  jsonb_build_array(
    'buzon/TAREA.TXT',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
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
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'apps/web/cypress/support/liveProtectedRuntime.ts',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
    'scripts/run-canvas-source-import-live-proof.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'apps/web/package.json',
    'package.json',
    'tools/planning-db/migrations/290_register_canvas_source_import_live_proof.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
    'pnpm test:web:e2e:source-import:live',
    'node --test --test-name-pattern "tracked migrations register Canvas source import live proof feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
    'pnpm test:web:e2e:source-import:live',
    'node --test --test-name-pattern "tracked migrations register Canvas source import live proof feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/290_register_canvas_source_import_live_proof.sql',
  md5('E-CANVAS-ADD-SOURCE-LIVE-FLOW-1:AttachWarehouseSourceFromCanvasContext:290')
    || md5('CanvasSourceImportDialog:live-proof:protected-runtime'),
  jsonb_build_object(
    'name', 'AttachWarehouseSourceFromCanvasContext',
    'type', 'command',
    'dddOwner', 'CanvasSourceImportDialog',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Prove contextual Add Source from the canvas menu against the protected runtime: clean authoring scope, real graph draft creation, warehouse catalog browse, metadata inspection, source attachment and source YAML artifact write.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.CanvasContextMenu',
      'web.component.canvas.CanvasSourceImportDialog'
    ),
    'userStories', jsonb_build_array(
      'As a DVT/Raven canvas author, I can right-click the canvas, choose Add source, browse governed warehouse tables, inspect columns and attach a source node without leaving the graph.',
      'As a reviewer, the live proof cannot use cy.intercept or direct PUT seeding for /workspace/graph/draft and must read the produced source artifact from the protected runtime.'
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
      'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
      'apps/web/src/app/components/SourceImportWizard.test.tsx',
      'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
      'apps/web/cypress/support/liveProtectedRuntime.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
      'scripts/run-canvas-source-import-live-proof.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'apps/web/package.json',
      'package.json',
      'tools/planning-db/migrations/290_register_canvas_source_import_live_proof.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/archive/**',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasSourceImportDialog',
      'WorkspaceWarehouseSourceCatalog',
      'CanvasGraphDraft'
    ),
    'fowlerSignals', jsonb_build_array(
      'hidden_authority',
      'primitive_obsession',
      'test_only_confidence'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
      'node --test --test-name-pattern "tracked migrations register Canvas source import live proof feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
      'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
      'pnpm test:web:e2e:source-import:live',
      'node --test --test-name-pattern "tracked migrations register Canvas source import live proof feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'AttachWarehouseSourceFromCanvasContext',
        'type', 'command',
        'dddOwner', 'CanvasSourceImportDialog',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-source-import-live-feature-manifest',
        'redTest',
        'node --test --test-name-pattern "tracked migrations register Canvas source import live proof feature mechanization" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'The live Add Source proof runner and Cypress helpers are not represented by a DB-backed feature mechanization manifest migration.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/290_register_canvas_source_import_live_proof.sql'
        ),
        'greenTest',
        'node --test --test-name-pattern "tracked migrations register Canvas source import live proof feature mechanization" scripts/planning-db-migrate.test.cjs'
      ),
      jsonb_build_object(
        'id', 'canvas-source-import-live-clean-browser-proof',
        'redTest',
        'pnpm test:web:e2e:source-import:live',
        'expectedFailure',
        'The Add Source flow can pass with a fake graph draft, missing warehouse metadata, or no source artifact unless the live protected runtime proof drives the real UI and reads the persisted source YAML.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
          'scripts/run-canvas-source-import-live-proof.cjs',
          'apps/web/cypress/support/liveProtectedRuntime.ts'
        ),
        'greenTest',
        'pnpm test:web:e2e:source-import:live'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'visitCleanDbtCanvas',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'test_only_confidence'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      ),
      jsonb_build_object(
        'name', 'waitForLiveDraftSaved',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphDraft',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('hidden_authority'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportLiveProofRunner',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'test_only_confidence'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      ),
      jsonb_build_object(
        'name', 'http',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('test_only_confidence'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      ),
      jsonb_build_object(
        'name', 'https',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('test_only_confidence'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      ),
      jsonb_build_object(
        'name', 'main',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('test_only_confidence'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      ),
      jsonb_build_object(
        'name', 'path',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('test_only_confidence'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      ),
      jsonb_build_object(
        'name', 'readline',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('test_only_confidence'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
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
