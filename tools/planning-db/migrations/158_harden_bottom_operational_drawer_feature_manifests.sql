-- Keep DB-authored feature manifests aligned with the canonical bottom
-- operational drawer vocabulary after retiring BottomConsoleDrawer.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = raw_manifest || jsonb_build_object(
    'forbiddenImplementationSurfaces',
    jsonb_build_array('apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts'),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'BottomOperationalDrawerLogModel',
        'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'BottomOperationalDrawerLogModelBase',
        'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'BuildBottomOperationalDrawerLogModelInput',
        'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildBottomOperationalDrawerLogModel',
        'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
      )
    )
  ),
  revision = revision + 1,
  updated_at = now()
where
  feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
  and normalized_rail_name = 'buildbottomoperationaldrawerlogmodel';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = raw_manifest || jsonb_build_object(
    'forbiddenImplementationSurfaces',
    jsonb_build_array('apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts'),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'BottomOperationalProblemsPanel',
        'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx')
      ),
      jsonb_build_object(
        'name', 'BottomOperationalRunsPanel',
        'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx')
      ),
      jsonb_build_object(
        'name', 'BottomOperationalPreviewPanel',
        'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx')
      ),
      jsonb_build_object(
        'name', 'BottomOperationalDrawerTabs',
        'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx')
      ),
      jsonb_build_object(
        'name', 'BottomOperationalDrawerBody',
        'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx')
      )
    )
  ),
  revision = revision + 1,
  updated_at = now()
where
  feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
  and normalized_rail_name = 'renderbottomoperationaldrawer';
