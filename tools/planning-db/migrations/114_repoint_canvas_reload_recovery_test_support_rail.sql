-- Reconcile the Canvas reload recovery test-support rail with the tracked
-- support module. The earlier DB-local row pointed to a split support file and
-- protected-draft test that are not present on main; the implemented support
-- contract now lives in useCanvasController.reloadRecovery.test.support.ts.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  source_path = 'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts',
  source_content_sha256 = 'c7f15764501fd647950692bb9324bf36cbd1acb2177de6ea35ea56e7e7d8d04a',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts#createReloadRecoveryHarness',
    'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts#replaceHarnessWithDraft',
    'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts#reloadLatestDraft'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts#createReloadRecoveryHarness',
    'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts#replaceHarnessWithDraft',
    'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts#reloadLatestDraft',
    'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-a-authoring-draft-hard-cut-implementation-plan-20260503.md'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      coalesce(raw_rail, '{}'::jsonb),
      '{status}',
      '"implemented"'::jsonb,
      true
    ),
    '{sourceRepointReason}',
    to_jsonb(
      'Repointed from removed useCanvasController.reloadConflictRecovery.test.support.ts to the tracked reloadRecovery support module and removed nonexistent protected-draft test references.'::text
    ),
    true
  ),
  raw_manifest = jsonb_build_object(
    'version',
    1,
    'featureId',
    'CANVAS-RELOAD-TEST-MODULARIZATION-20260617',
    'mechanizationStatus',
    'implemented',
    'noHumanDecisionsRemaining',
    true,
    'implementationPlan',
    'docs/architecture/components/web/frontend-component-inventory.md',
    'userStories',
    jsonb_build_array('docs/planning/reviews/20260608-sql-canvas-demanding-user-flow-review.md'),
    'componentGuides',
    jsonb_build_array(
      'docs/architecture/components/web/frontend-component-inventory.md',
      'docs/architecture/command-query-rail-governance.md'
    ),
    'governingSources',
    jsonb_build_array(
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/guides/ai-work-protocol.md'
    ),
    'domainObjects',
    jsonb_build_array('CanvasControllerReloadRecoveryTestContract'),
    'fowlerSignals',
    jsonb_build_array(
      'Canvas reload recovery tests are split by observable recovery contract instead of one monolithic test narrative.'
    ),
    'cypressFlows',
    jsonb_build_array('N/A - component/controller test modularization slice'),
    'architectureGuards',
    jsonb_build_array('pnpm --filter @dvt/web test:changed'),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'VerifyCanvasReloadRecoveryTestSupport',
        'type',
        'query',
        'status',
        'implemented',
        'dddOwner',
        'WebCanvasControllerReloadRecoveryTestContract'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'createReloadRecoveryHarness',
        'path',
        'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts',
        'cqRails',
        jsonb_build_array('VerifyCanvasReloadRecoveryTestSupport'),
        'dddOwner',
        'WebCanvasControllerReloadRecoveryTestContract',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
        ),
        'fowlerSignals',
        jsonb_build_array(
          'Canvas reload recovery test support is shared by focused conflict and hydration guard contracts.'
        ),
        'cypressCoverage',
        'N/A - component/controller test modularization slice',
        'architectureGuard',
        'pnpm --filter @dvt/web test:changed'
      ),
      jsonb_build_object(
        'name',
        'replaceHarnessWithDraft',
        'path',
        'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts',
        'cqRails',
        jsonb_build_array('VerifyCanvasReloadRecoveryTestSupport'),
        'dddOwner',
        'WebCanvasControllerReloadRecoveryTestContract',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
        ),
        'fowlerSignals',
        jsonb_build_array(
          'Canvas reload recovery test support is shared by focused conflict and hydration guard contracts.'
        ),
        'cypressCoverage',
        'N/A - component/controller test modularization slice',
        'architectureGuard',
        'pnpm --filter @dvt/web test:changed'
      ),
      jsonb_build_object(
        'name',
        'reloadLatestDraft',
        'path',
        'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts',
        'cqRails',
        jsonb_build_array('VerifyCanvasReloadRecoveryTestSupport'),
        'dddOwner',
        'WebCanvasControllerReloadRecoveryTestContract',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
        ),
        'fowlerSignals',
        jsonb_build_array(
          'Canvas reload recovery test support is shared by focused conflict and hydration guard contracts.'
        ),
        'cypressCoverage',
        'N/A - component/controller test modularization slice',
        'architectureGuard',
        'pnpm --filter @dvt/web test:changed'
      )
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
    ),
    'forbiddenImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasController.reloadProtectedDraft.test.tsx'
    ),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id',
        'verifycanvasreloadrecoverytestsupport-repoint',
        'redTest',
        'pnpm planning:db:query source-drift --limit 20 --no-refresh',
        'greenTest',
        'pnpm docs:feature-mechanization:implementation',
        'patchSurfaces',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts',
          'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
        ),
        'expectedFailure',
        'DB-local reload recovery support rail pointed to removed support/test files.'
      )
    ),
    'completionGate',
    jsonb_build_array(
      'pnpm --filter @dvt/web test:changed',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check',
      'pnpm verify:prepush'
    ),
    'sourceRepointReason',
    'Repointed from removed useCanvasController.reloadConflictRecovery.test.support.ts to the tracked reloadRecovery support module and removed nonexistent protected-draft test references.'
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-RELOAD-TEST-MODULARIZATION-20260617#query#verifycanvasreloadrecoverytestsupport';
