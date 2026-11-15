/** Owned concern: preserve complete global-style proof and distinct companion environments. */
import { describe, expect, it } from 'vitest';

import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { WEB_VITEST_CHANGED_SUITE_COMMANDS } from '../../vitest/commands';
import { WEB_VITEST_PRIMARY_SUITE_NAMES } from '../../vitest.suites';
import { selectWebCypressLocalReadiness } from '../../cypress.changed';
import {
  WEB_CYPRESS_CAPABILITIES,
  WEB_CYPRESS_NATIVE_PLATFORMS,
  WEB_CYPRESS_SPECS,
} from '../../cypress.catalog';

const primaryCommands = WEB_VITEST_PRIMARY_SUITE_NAMES.map(
  (suite) => WEB_VITEST_CHANGED_SUITE_COMMANDS[suite]
);
const catalogSpecs = WEB_CYPRESS_CAPABILITIES.flatMap((key) => WEB_CYPRESS_SPECS[key]);
const globalFiles = [
  'index.css',
  'theme.css',
  'themeBase.css',
  'fonts.css',
  'tailwind.css',
  'nested/new.css',
  'deleted.css',
  'renamed-old.css',
].flatMap((name) => {
  const relative = `src/styles/${name}`;
  return [relative, `apps/web/${relative}`, `./apps/web/${relative.replaceAll('/', '\\')}`];
});

describe('global Web styles evidence routing', () => {
  it.each(globalFiles)(
    'requires complete canonical proof without filesystem presence: %s',
    (file) => {
      const plan = resolveWebVitestChangedSuitePlan([file]);
      expect(plan.suites).toEqual(WEB_VITEST_PRIMARY_SUITE_NAMES);
      expect(plan.commands).toEqual(primaryCommands);
      expect(plan.requiresDependencies).toBe(true);
      expect(plan.browserCommands.map((entry) => entry.capability)).toEqual(
        WEB_CYPRESS_CAPABILITIES
      );
      for (const entry of plan.browserCommands) {
        expect(entry.specPaths).toEqual(WEB_CYPRESS_SPECS[entry.capability]);
      }
      expect(plan.browserFiles).toEqual(catalogSpecs);
      expect(plan.browserFiles).not.toContain(file);
    }
  );

  it('absorbs equivalent Canvas and exact primary batches in a mixed diff in either order', () => {
    const mixed = [
      'apps/web/src/styles/theme.css',
      'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      'apps/web/src/app/views/canvas/CanvasToolbar.test.tsx',
      'apps/web/src/app/lib/format.test.ts',
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      WEB_CYPRESS_SPECS.controlled[0]!,
      'apps/web/src/styles/fonts.css',
    ];
    const plan = resolveWebVitestChangedSuitePlan(mixed);
    expect(plan.commands).toEqual(primaryCommands);
    expect(plan.commandPlan).toEqual(
      primaryCommands.map((command) => ({ kind: 'shell', command }))
    );
    expect(plan.browserCommands.flatMap((entry) => entry.specPaths)).toEqual(catalogSpecs);
    expect(new Set(plan.browserFiles).size).toBe(plan.browserFiles.length);
    expect(resolveWebVitestChangedSuitePlan([...mixed].reverse())).toEqual(plan);
  });

  it.each([
    ['monaco', 'src/app/views/code/codeViewCopy.ts'],
    ['shell-session', 'src/app/components/shell/appBuildMetadata.ts'],
    ['workspace-services', 'src/app/services/workspace/sourceObjectMetricEvidence.ts'],
  ] as const)('retains the distinct %s context with global primary proof', (focus, companion) => {
    const plan = resolveWebVitestChangedSuitePlan(['src/styles/index.css', companion]);
    expect(plan.suites).toEqual([focus, ...WEB_VITEST_PRIMARY_SUITE_NAMES]);
    expect(plan.commands).toEqual([WEB_VITEST_CHANGED_SUITE_COMMANDS[focus], ...primaryCommands]);
  });

  it('preserves exact focus evidence whose environment is not covered by primary suites', () => {
    const exact = 'src/app/views/code/codeViewCopy.test.ts';
    const plan = resolveWebVitestChangedSuitePlan(['src/styles/index.css', exact]);
    expect(plan.commandPlan[0]).toEqual({
      kind: 'vitest-files',
      config: 'vitest.monaco.config.ts',
      filePaths: [exact],
    });
    expect(plan.commands.slice(1)).toEqual(primaryCommands);
  });

  it.each(['win32', 'linux', 'darwin'] as const)(
    'keeps declared native or conservative unsupported-host proof on %s',
    (platform) => {
      const complete = resolveWebVitestChangedSuitePlan([
        'src/styles/themeBase.css',
      ]).browserCommands;
      const local = complete.flatMap((command) => {
        const projected = selectWebCypressLocalReadiness(command, platform, [
          'src/styles/themeBase.css',
        ]);
        return projected ? projected.specPaths : [];
      });
      expect(local).toEqual(
        platform === 'darwin' ? catalogSpecs : (WEB_CYPRESS_NATIVE_PLATFORMS[platform] ?? [])
      );
      expect(complete.flatMap((command) => command.specPaths)).toEqual(catalogSpecs);
    }
  );

  it.each([
    'apps/web/cypress/support/unregisteredGlobalStyle.ts',
    'apps/web/cypress/e2e/unregistered-global-style.cy.ts',
  ])('still rejects an unadmitted companion after global CSS: %s', (file) => {
    expect(() => resolveWebVitestChangedSuitePlan(['src/styles/index.css', file])).toThrow(file);
    expect(() => resolveWebVitestChangedSuitePlan([file, 'src/styles/index.css'])).toThrow(file);
  });

  it.each([
    'src/styles-neighbor/theme.css',
    'src/styles/index.css.map',
    'packages/theme/styles.css',
    'apps/other/src/styles/theme.css',
  ])('does not broaden unrelated surfaces: %s', (file) => {
    expect(resolveWebVitestChangedSuitePlan([file]).commands).toEqual([]);
    expect(resolveWebVitestChangedSuitePlan([file]).browserCommands).toEqual([]);
  });

  it('preserves component CSS and ordinary TypeScript routes', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['src/app/views/canvas/Card.module.css']).suites
    ).toEqual(['canvas-unit']);
    expect(resolveWebVitestChangedSuitePlan(['src/lib/format.ts']).suites).toEqual([
      'unit',
      'architecture',
    ]);
  });
});
