/**
 * @ownedConcern Validate changed-file routing for the web Vitest suite router
 * as a focused command/query rail contract.
 */
import { describe, expect, it } from 'vitest';

import {
  resolveWebVitestChangedSuitePlan,
  type WebVitestChangedSuiteName,
  WEB_VITEST_CHANGED_SUITE_COMMANDS,
} from '../../vitest.suites';
import { suiteMatchesFile } from './vitestSuites.architecture.support';

describe('web Vitest changed-file routing', () => {
  it('routes Canvas source changes to the smallest governed suite', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/canvas/CanvasToolbar.tsx'])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation']],
      requiresDependencies: true,
      suites: ['canvas-presentation'],
    });

    expect(resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/Canvas.tsx'])).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation']],
      requiresDependencies: true,
      suites: ['canvas-presentation'],
    });

    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/Canvas.test.support.tsx'])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation']],
      requiresDependencies: true,
      suites: ['canvas-presentation'],
    });
  });

  it('routes direct changed Canvas tests without running the whole focus suite', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/canvas/canvasDraftScope.test.ts'])
    ).toMatchObject({
      commands: [
        'pnpm exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/canvasDraftScope.test.ts',
      ],
      requiresDependencies: false,
      suites: ['canvas-unit'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
        'apps/web/src/app/views/canvas/CanvasToolbar.test.tsx',
      ])
    ).toMatchObject({
      commands: [
        'pnpm exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasToolbar.test.tsx',
      ],
      requiresDependencies: false,
      suites: ['canvas-presentation'],
    });
  });

  it('routes multi-layer Canvas changes to unit, presentation, and architecture checks', () => {
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
        'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx',
        'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts',
        'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts',
        'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      ])
    ).toMatchObject({
      commands: [
        'pnpm exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts',
        'pnpm exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasInspectorPanel.test.tsx',
        'pnpm exec vitest run --config vitest.canvas-architecture.config.ts src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      ],
      requiresDependencies: false,
      suites: ['canvas-unit', 'canvas-presentation', 'canvas-architecture'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/components/InspectorPanel.tsx',
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
        'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
        'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
        'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx',
      ])
    ).toMatchObject({
      commands: [
        [
          'pnpm exec vitest run --config vitest.canvas-unit.config.ts',
          'src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
          'src/app/components/inspector/nodePropertiesReadModel.test.ts',
        ].join(' '),
        'pnpm exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasInspectorPanel.test.tsx',
        'pnpm exec vitest run --config vitest.canvas-architecture.config.ts src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
      ],
      requiresDependencies: false,
      suites: ['canvas-unit', 'canvas-presentation', 'canvas-architecture'],
    });
  });

  it('routes non-Canvas focus surfaces to their owned focus suites', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/components/monaco/MonacoCodeSurface.tsx'])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco],
      requiresDependencies: true,
      suites: ['monaco'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.tsx',
      ])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['shell-session']],
      requiresDependencies: true,
      suites: ['shell-session'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/services/session/workspaceScopeSelectionPort.ts',
      ])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['shell-session']],
      requiresDependencies: true,
      suites: ['shell-session'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.tsx',
        'apps/web/src/app/services/session/workspaceScopeSelectionPort.ts',
        'apps/web/src/app/services/workspace/workspaceDiffChangesHttp.ts',
      ])
    ).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS['shell-session'],
        WEB_VITEST_CHANGED_SUITE_COMMANDS['workspace-services'],
      ],
      requiresDependencies: true,
      suites: ['shell-session', 'workspace-services'],
    });
  });

  it('routes generic source changes and ignores non-web paths', () => {
    expect(resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/CodeView.tsx'])).toMatchObject(
      {
        commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco],
        requiresDependencies: true,
        suites: ['monaco'],
      }
    );

    expect(resolveWebVitestChangedSuitePlan(['apps/web/src/app/Root.tsx'])).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.presentation],
      requiresDependencies: true,
      suites: ['presentation'],
    });

    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/services/runs/runsService.ts'])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.unit],
      requiresDependencies: true,
      suites: ['unit'],
    });

    expect(WEB_VITEST_CHANGED_SUITE_COMMANDS).not.toHaveProperty('canvas');
    expect(resolveWebVitestChangedSuitePlan(['apps/api/src/server.ts'])).toMatchObject({
      commands: [],
      requiresDependencies: false,
      suites: [],
    });
  });

  it('keeps exact changed-test routing aligned with runnable suite include globs', () => {
    const plan = resolveWebVitestChangedSuitePlan([
      'apps/web/src/app/components/InspectorPanel.test.tsx',
    ]);

    expect(plan.commandPlan).toEqual([
      {
        config: 'vitest.canvas-presentation.config.ts',
        filePaths: ['src/app/components/InspectorPanel.test.tsx'],
        kind: 'vitest-files',
      },
    ]);

    for (const entry of plan.commandPlan) {
      expect(entry.kind).toBe('vitest-files');
      if (entry.kind !== 'vitest-files') {
        continue;
      }

      const suiteName = entry.config
        .replace(/^vitest\./, '')
        .replace(/\.config\.ts$/, '') as WebVitestChangedSuiteName;

      for (const filePath of entry.filePaths) {
        expect(suiteMatchesFile(suiteName, filePath), `${suiteName} must include ${filePath}`).toBe(
          true
        );
      }
    }
  });
});
