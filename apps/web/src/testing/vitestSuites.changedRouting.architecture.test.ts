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
  it.each([
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/Canvas.tsx',
    'apps/web/src/app/views/Canvas.test.support.tsx',
  ])('routes %s with focused behavior and cross-module architecture', (file) => {
    expect(resolveWebVitestChangedSuitePlan([file])).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation'],
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['canvas-presentation', 'architecture'],
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
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['canvas-presentation', 'architecture'],
    });
  });

  it('routes multi-layer Canvas changes to unit, presentation, and architecture checks', () => {
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
        'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts',
        'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts',
        'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      ])
    ).toMatchObject({
      commands: [
        'pnpm exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts',
        WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation'],
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['canvas-unit', 'canvas-presentation', 'architecture'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
        'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
        'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
        'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
      ])
    ).toMatchObject({
      commands: [
        [
          'pnpm exec vitest run --config vitest.canvas-unit.config.ts',
          'src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
          'src/app/components/inspector/nodePropertiesReadModel.test.ts',
        ].join(' '),
        WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation'],
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['canvas-unit', 'canvas-presentation', 'architecture'],
    });
  });

  it('routes non-Canvas focus surfaces to their owned focus suites', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/components/monaco/MonacoCodeSurface.tsx'])
    ).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco,
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['monaco', 'architecture'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.tsx',
      ])
    ).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS['shell-session'],
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['shell-session', 'architecture'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/services/session/workspaceScopeSelectionPort.ts',
      ])
    ).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS['shell-session'],
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['shell-session', 'architecture'],
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
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['shell-session', 'workspace-services', 'architecture'],
    });
  });

  it('routes generic source changes and ignores non-web paths', () => {
    expect(resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/CodeView.tsx'])).toMatchObject(
      {
        commands: [
          WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco,
          WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
        ],
        requiresDependencies: true,
        suites: ['monaco', 'architecture'],
      }
    );

    expect(resolveWebVitestChangedSuitePlan(['apps/web/src/app/Root.tsx'])).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS.presentation,
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['presentation', 'architecture'],
    });

    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/services/runs/runsService.ts'])
    ).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS.unit,
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['unit', 'architecture'],
    });

    expect(WEB_VITEST_CHANGED_SUITE_COMMANDS).not.toHaveProperty('canvas');
    expect(resolveWebVitestChangedSuitePlan(['apps/api/src/server.ts'])).toMatchObject({
      commands: [],
      requiresDependencies: false,
      suites: [],
    });
  });

  it.each([
    ['unit', 'src/app/lib/first.ts', 'src/app/lib/second.ts'],
    ['canvas-presentation', 'src/app/views/canvas/First.tsx', 'src/app/views/canvas/Second.tsx'],
  ] as const)('preserves the %s obligation of an unpaired source', (suite, first, second) => {
    const firstTest = first.replace(/\.(tsx?)$/, '.test.$1');
    for (const changed of [
      [second, firstTest],
      [first, firstTest, second],
    ]) {
      const plan = resolveWebVitestChangedSuitePlan(changed);
      expect(plan.commands).toEqual([
        WEB_VITEST_CHANGED_SUITE_COMMANDS[suite],
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ]);
      expect(plan.requiresDependencies).toBe(true);
    }
  });

  it.each([
    ['unit', 'src/app/views/canvas/canvasDraftScope.ts', 'src/app/lib/general.ts'],
    ['presentation', 'src/app/views/canvas/CanvasToolbar.tsx', 'src/app/Root.tsx'],
  ] as const)(
    'executes complete %s coverage only once for mixed Canvas changes',
    (primary, focus, general) => {
      const focusTest = focus.replace(/\.(tsx?)$/, '.test.$1');
      for (const changed of [
        [focus, general],
        [focusTest, general],
        [focus, focusTest, general],
      ]) {
        const plan = resolveWebVitestChangedSuitePlan(changed);
        expect(plan.commands).toEqual([
          WEB_VITEST_CHANGED_SUITE_COMMANDS[primary],
          WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
        ]);
        expect(plan.suites).toEqual([primary, 'architecture']);
        expect(resolveWebVitestChangedSuitePlan([...changed].reverse())).toEqual(plan);
      }
    }
  );

  it('does not mistake an exact primary batch for full coverage', () => {
    const plan = resolveWebVitestChangedSuitePlan([
      'src/app/views/canvas/CanvasToolbar.tsx',
      'src/app/Root.test.tsx',
    ]);
    expect(plan.suites).toEqual(['canvas-presentation', 'presentation', 'architecture']);
    expect(plan.commandPlan).toEqual([
      { kind: 'shell', command: WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation'] },
      {
        kind: 'vitest-files',
        config: 'vitest.presentation.config.ts',
        filePaths: ['src/app/Root.test.tsx'],
      },
      { kind: 'shell', command: WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture },
    ]);
  });

  it.each([
    ['monaco', 'src/app/views/code/codeViewCopy.ts'],
    ['shell-session', 'src/app/components/shell/appBuildMetadata.ts'],
    ['workspace-services', 'src/app/services/workspace/sourceObjectMetricEvidence.ts'],
  ] as const)('preserves the %s environment alongside primary coverage', (focus, file) => {
    expect(resolveWebVitestChangedSuitePlan([file, 'src/app/lib/general.ts']).suites).toEqual([
      focus,
      'unit',
      'architecture',
    ]);
  });

  it('keeps exact changed-test routing aligned with runnable suite include globs', () => {
    const plan = resolveWebVitestChangedSuitePlan([
      'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
      'apps/web/src/app/components/TopAppBar.architecture.test.ts',
    ]);

    expect(plan.commandPlan).toEqual([
      {
        config: 'vitest.canvas-presentation.config.ts',
        filePaths: ['src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx'],
        kind: 'vitest-files',
      },
      {
        config: 'vitest.shell-session.config.ts',
        filePaths: ['src/app/components/TopAppBar.architecture.test.ts'],
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
