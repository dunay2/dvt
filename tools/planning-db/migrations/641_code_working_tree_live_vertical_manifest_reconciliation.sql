-- Keep the DB-first local rail manifest complete and independently
-- mechanizable after live-evidence promotion. This reconciles the manifest;
-- it does not add product rails or broaden implementation scope.

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = jsonb_build_array(
    'scripts/run-selected-closure-live-proof.cjs#DEFAULT_SPEC_RELATIVE_PATH',
    'scripts/run-selected-closure-live-proof.cjs#resolveLiveProofSpecPath',
    'scripts/run-selected-closure-live-proof.cjs#main',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts#openNodeWorkbench',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts#openLiveProjectCodeFile',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts#waitForLiveWorkspaceFileContent'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/code-workbench-workspace-files-component.md',
    'docs/architecture/components/web/code-workbench-workspace-files-user-stories.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  governing_sources = jsonb_build_array(
    'AGENTS.md',
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/guides/ai-work-protocol.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'apps/web/package.json',
    'package.json',
    'scripts/planning-db-migrate.test.cjs',
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-live-proof.test.cjs',
    'tools/planning-db/migrations/637_code_working_tree_live_vertical_design.sql',
    'tools/planning-db/migrations/638_code_working_tree_live_vertical_command_rail.sql',
    'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql',
    'tools/planning-db/migrations/640_code_working_tree_read_rail_component_mapping.sql',
    'tools/planning-db/migrations/641_code_working_tree_live_vertical_manifest_reconciliation.sql',
    'docs/architecture/components/web/code-workbench-workspace-files-component.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  architecture_guards = jsonb_build_array(
    'node --test scripts/run-selected-closure-live-proof.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts',
    'no workspace-file route intercepts',
    'no direct edited-content seeding',
    'no filesystem-only persistence assertion',
    'no visible Save action'
  ),
  completion_gate = jsonb_build_array(
    'node --test scripts/run-selected-closure-live-proof.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm test:web:e2e:dbt-author-code-run:live',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  raw_manifest = jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-CODE-WORKING-TREE-SYNC-20260712',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'owner', 'Frontend / Project Workspace I/O',
    'implementationPlan', 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/code-workbench-workspace-files-component.md'
    ),
    'userStories', jsonb_build_array(
      'docs/architecture/components/web/code-workbench-workspace-files-user-stories.md'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
      'apps/web/package.json',
      'package.json',
      'scripts/planning-db-migrate.test.cjs',
      'scripts/run-selected-closure-live-proof.cjs',
      'scripts/run-selected-closure-live-proof.test.cjs',
      'tools/planning-db/migrations/637_code_working_tree_live_vertical_design.sql',
      'tools/planning-db/migrations/638_code_working_tree_live_vertical_command_rail.sql',
      'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql',
      'tools/planning-db/migrations/640_code_working_tree_read_rail_component_mapping.sql',
      'tools/planning-db/migrations/641_code_working_tree_live_vertical_manifest_reconciliation.sql',
      'docs/architecture/components/web/code-workbench-workspace-files-component.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'packages/@dvt/contracts/**',
      'packages/@dvt/engine/**',
      'packages/@dvt/adapter-*/**',
      'packages/@dvt/planner/**'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'GetWorkspaceFileContent', 'type', 'query', 'dddOwner', 'WorkspaceFileContentReadModel'),
      jsonb_build_object('name', 'SaveWorkspaceFileContent', 'type', 'command', 'dddOwner', 'WorkspaceFileContent'),
      jsonb_build_object('name', 'RunDbtAuthorCodeRunLiveProof', 'type', 'command', 'dddOwner', 'ProtectedRuntimeLiveProof')
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object('name', 'CodeWorkingTreeSync', 'type', 'presentation model', 'owner', 'apps/web'),
      jsonb_build_object('name', 'CodeWorkingTreeLiveProofRun', 'type', 'delivery proof run', 'owner', 'DeliveryRuntimeProofs')
    ),
    'fowlerSignals', jsonb_build_array(
      'Hidden authority',
      'Published-language drift',
      'Test-only confidence',
      'Duplicate semantics'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test scripts/run-selected-closure-live-proof.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web test:architecture:run -- src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'node --test scripts/run-selected-closure-live-proof.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm test:web:e2e:dbt-author-code-run:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'code-working-tree-live-runner-selection',
        'redTest', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
        'expectedFailure', 'The protected-runtime runner cannot select a governed Cypress spec.',
        'patchSurfaces', jsonb_build_array(
          'scripts/run-selected-closure-live-proof.cjs',
          'scripts/run-selected-closure-live-proof.test.cjs'
        ),
        'greenTest', 'node --test scripts/run-selected-closure-live-proof.test.cjs'
      ),
      jsonb_build_object(
        'id', 'code-working-tree-live-browser-round-trip',
        'redTest', 'pnpm test:web:e2e:dbt-author-code-run:live',
        'expectedFailure', 'The DBT live spec cannot persist and reopen a Monaco edit through protected workspace-file rails.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
        ),
        'greenTest', 'pnpm test:web:e2e:dbt-author-code-run:live'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'DEFAULT_SPEC_RELATIVE_PATH',
        'path', 'scripts/run-selected-closure-live-proof.cjs',
        'dddOwner', 'ProtectedRuntimeLiveProof command input',
        'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'),
        'fowlerSignals', jsonb_build_array('Duplicate semantics'),
        'architectureGuard', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array('scripts/run-selected-closure-live-proof.test.cjs')
      ),
      jsonb_build_object(
        'name', 'resolveLiveProofSpecPath',
        'path', 'scripts/run-selected-closure-live-proof.cjs',
        'dddOwner', 'ProtectedRuntimeLiveProof command input',
        'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'),
        'fowlerSignals', jsonb_build_array('Duplicate semantics'),
        'architectureGuard', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array('scripts/run-selected-closure-live-proof.test.cjs')
      ),
      jsonb_build_object(
        'name', 'openNodeWorkbench',
        'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'dddOwner', 'Canvas node workbench live proof',
        'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'),
        'fowlerSignals', jsonb_build_array('Test-only confidence'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/routes/internalAlphaRouteGate.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts')
      ),
      jsonb_build_object(
        'name', 'openLiveProjectCodeFile',
        'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'dddOwner', 'CodeWorkingTreeSync live browser proof',
        'cqRails', jsonb_build_array('GetWorkspaceFileContent', 'SaveWorkspaceFileContent'),
        'fowlerSignals', jsonb_build_array('Test-only confidence'),
        'architectureGuard', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts')
      ),
      jsonb_build_object(
        'name', 'waitForLiveWorkspaceFileContent',
        'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'dddOwner', 'WorkspaceFileContent live read model proof',
        'cqRails', jsonb_build_array('GetWorkspaceFileContent'),
        'fowlerSignals', jsonb_build_array('Hidden authority'),
        'architectureGuard', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts')
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/641_code_working_tree_live_vertical_manifest_reconciliation.sql',
  source_content_sha256 = repeat(md5('RunDbtAuthorCodeRunLiveProof:manifest:641'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_id = 'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';
