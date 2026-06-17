-- Reconcile the Canvas create-document command test-support rail with the
-- tracked test module. The DB-local row pointed to split support/replacement
-- files that are not present on main; the implemented command test contract is
-- still owned by canvasCreateCanvasDocumentCommand.test.ts.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  source_path = 'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
  source_content_sha256 = 'f8488b1ed30a9739da37be1b6d3415f41c625637fed53da3278495ee3c086c50',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#BuildCommandArgsResult',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#BuildCommandOverrides',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#DraftRecordFixture',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#applyStateUpdater',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#buildCommandArgs',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#buildEmptyDraft',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#buildRecord'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#BuildCommandArgsResult',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#BuildCommandOverrides',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#DraftRecordFixture',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#applyStateUpdater',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#buildCommandArgs',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#buildEmptyDraft',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts#buildRecord',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.ts',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommandPolicy.ts',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentSaveResult.ts'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-a-authoring-draft-hard-cut-implementation-plan-20260503.md'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"implemented"'::jsonb,
        true
      ),
      '{sourceRepointReason}',
      to_jsonb(
        'Repointed from removed canvasCreateCanvasDocumentCommand.test.support.ts and non-existent split tests to the tracked canonical command test module.'::text
      ),
      true
    ),
    '{deprecatedSourcePaths}',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.support.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.replacement.test.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.guards.test.ts'
    ),
    true
  ),
  raw_manifest = jsonb_build_object(
    'version',
    1,
    'featureId',
    'CANVAS-CREATE-DOCUMENT-TEST-MODULARIZATION-20260617',
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
    jsonb_build_array('CanvasCreateCanvasDocumentCommandTestContract'),
    'fowlerSignals',
    jsonb_build_array(
      'Canvas create-document command test support remains in the canonical command test until a real split support module exists.'
    ),
    'cypressFlows',
    jsonb_build_array('N/A - command model test modularization slice'),
    'architectureGuards',
    jsonb_build_array(
      'pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts'
    ),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'VerifyCanvasCreateDocumentCommandTestSupport',
        'type',
        'query',
        'status',
        'implemented',
        'dddOwner',
        'WebCanvasCreateDocumentCommandTestContract'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'BuildCommandArgsResult',
        'path',
        'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
        'cqRails',
        jsonb_build_array('VerifyCanvasCreateDocumentCommandTestSupport'),
        'dddOwner',
        'WebCanvasCreateDocumentCommandTestContract',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts'
        ),
        'fowlerSignals',
        jsonb_build_array('The command test fixture owns the read/write contract used by the create-document command tests.'),
        'cypressCoverage',
        'N/A - command model test modularization slice',
        'architectureGuard',
        'pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts'
      ),
      jsonb_build_object(
        'name',
        'BuildCommandOverrides',
        'path',
        'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
        'cqRails',
        jsonb_build_array('VerifyCanvasCreateDocumentCommandTestSupport'),
        'dddOwner',
        'WebCanvasCreateDocumentCommandTestContract',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts'
        ),
        'fowlerSignals',
        jsonb_build_array('The command test fixture owns override paths for replacement and conflict behavior.'),
        'cypressCoverage',
        'N/A - command model test modularization slice',
        'architectureGuard',
        'pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts'
      ),
      jsonb_build_object(
        'name',
        'buildCommandArgs',
        'path',
        'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
        'cqRails',
        jsonb_build_array('VerifyCanvasCreateDocumentCommandTestSupport'),
        'dddOwner',
        'WebCanvasCreateDocumentCommandTestContract',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts'
        ),
        'fowlerSignals',
        jsonb_build_array('The helper creates the command port test contract without inventing a separate support module.'),
        'cypressCoverage',
        'N/A - command model test modularization slice',
        'architectureGuard',
        'pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts'
      ),
      jsonb_build_object(
        'name',
        'buildEmptyDraft',
        'path',
        'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
        'cqRails',
        jsonb_build_array('VerifyCanvasCreateDocumentCommandTestSupport'),
        'dddOwner',
        'WebCanvasCreateDocumentCommandTestContract',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts'
        ),
        'fowlerSignals',
        jsonb_build_array('The helper keeps authoritative draft truth local to the command test contract.'),
        'cypressCoverage',
        'N/A - command model test modularization slice',
        'architectureGuard',
        'pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts'
      )
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommandPolicy.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentSaveResult.ts'
    ),
    'forbiddenImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.support.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.replacement.test.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.guards.test.ts'
    ),
    'deprecatedSourcePaths',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.support.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.replacement.test.ts',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.guards.test.ts'
    ),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id',
        'verifycanvascreatedocumentcommandtestsupport-repoint',
        'redTest',
        'pnpm planning:db:query source-drift --limit 20 --no-refresh',
        'greenTest',
        'pnpm docs:feature-mechanization:implementation',
        'patchSurfaces',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts'
        ),
        'expectedFailure',
        'DB-local create-document command support rail pointed to removed support/replacement/guard files.'
      )
    ),
    'completionGate',
    jsonb_build_array(
      'pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check',
      'pnpm verify:prepush'
    ),
    'sourceRepointReason',
    'Repointed from removed canvasCreateCanvasDocumentCommand.test.support.ts and non-existent split tests to the tracked canonical command test module.'
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-CREATE-DOCUMENT-TEST-MODULARIZATION-20260617#query#verifycanvascreatedocumentcommandtestsupport';
