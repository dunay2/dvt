/** Owned concern: preserve complete global-style proof and distinct companion environments. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';
import { createVitest } from 'vitest/node';

import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { WEB_VITEST_CHANGED_SUITE_COMMANDS } from '../../vitest/commands';
import { WEB_VITEST_PRIMARY_SUITE_NAMES } from '../../vitest.suites';
import { selectWebCypressLocalReadiness } from '../../cypress.changed';
import {
  WEB_CYPRESS_CAPABILITIES,
  WEB_CYPRESS_NATIVE_PLATFORMS,
  WEB_CYPRESS_SPECS,
} from '../../cypress.catalog';
import { main } from '../../scripts/run-vitest-changed-suites';
import { readWebVitestCoverageInventory } from '../../scripts/changed-suite-coverage';
import * as coverageAdapter from '../../scripts/changed-suite-coverage';
import { absorbWebVitestCommandPlan } from '../../vitest/commands';
import { selectUncoveredWebVitestFiles } from '../../vitest/coverage';
import * as runtimeConfig from '../../vitest/runtimeConfig';
import { listWebVitestFiles, suiteMatchesFile } from './vitestSuites.architecture.support';

vi.mock('node:fs', async (original) => {
  const actual = await original<typeof import('node:fs')>();
  return { ...actual, readdirSync: vi.fn(actual.readdirSync) };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

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

async function readNativeCoverageInventory(): Promise<readonly string[]> {
  const root = process.cwd();
  const context = await createVitest({
    root,
    config: resolve(root, 'vitest.config.ts'),
    watch: false,
    run: true,
  });
  try {
    return (await context.globTestSpecifications())
      .map((spec) => relative(root, spec.moduleId).replaceAll('\\', '/'))
      .sort();
  } finally {
    await context.close();
  }
}

describe('global Web styles evidence routing', () => {
  it('reads the complete real inventory from its own stable source-tree fixture', () => {
    const fixture = mkdtempSync(resolve(tmpdir(), 'dvt-focus-inventory-'));
    const plan = resolveWebVitestChangedSuitePlan([
      'src/styles/index.css',
      'src/app/views/code/codeViewCopy.ts',
    ]);
    try {
      mkdirSync(resolve(fixture, 'src/nested'), { recursive: true });
      writeFileSync(resolve(fixture, 'src/a.test.ts'), '');
      writeFileSync(resolve(fixture, 'src/nested/b.test.tsx'), '');
      writeFileSync(resolve(fixture, 'src/nested/production.ts'), '');
      expect(readWebVitestCoverageInventory(plan, fixture)).toEqual([
        'src/a.test.ts',
        'src/nested/b.test.tsx',
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
  it.each([
    ['src/app/views/code/codeViewCopy.ts'],
    ['src/styles/index.css'],
    ['src/app/components/PlanExecutionDecisionView.test.tsx'],
  ])('does not acquire new inventory for the small plan %s', (source) => {
    const plan = resolveWebVitestChangedSuitePlan([source]);
    expect(readWebVitestCoverageInventory(plan, process.cwd())).toBeNull();
    expect(readdirSync).not.toHaveBeenCalled();
  });

  it('retains the original complete plan when inventory cannot be acquired', () => {
    const plan = resolveWebVitestChangedSuitePlan([
      'src/styles/index.css',
      'src/app/views/code/codeViewCopy.ts',
    ]);
    const inventory = readWebVitestCoverageInventory(plan, '/missing-dvt-coverage-root');
    expect(inventory).toBeNull();
    expect(absorbWebVitestCommandPlan(plan, inventory)).toBe(plan);
  });

  it('does not acquire inventory for browser-only admission of an overlapping plan', () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    main([
      '--plan',
      '--phase=browser',
      '--files',
      'src/styles/index.css',
      'src/app/views/code/codeViewCopy.ts',
    ]);
    expect(readdirSync).not.toHaveBeenCalled();
  });

  it('retains unknown command shapes instead of reconstructing a partial plan', () => {
    const plan = {
      suites: [],
      commands: ['custom'],
      requiresDependencies: true,
      commandPlan: [{ kind: 'shell' as const, command: 'custom' }],
    };
    expect(absorbWebVitestCommandPlan(plan, listWebVitestFiles())).toBe(plan);
  });

  it('retains complete focus evidence for a source tree containing a real junction', () => {
    const fixture = mkdtempSync(resolve(tmpdir(), 'dvt-focus-coverage-'));
    const plan = resolveWebVitestChangedSuitePlan([
      'src/styles/index.css',
      'src/app/views/code/codeViewCopy.ts',
    ]);
    try {
      mkdirSync(resolve(fixture, 'src'));
      mkdirSync(resolve(fixture, 'external'));
      symlinkSync(resolve(fixture, 'external'), resolve(fixture, 'src/linked'), 'junction');
      expect(readWebVitestCoverageInventory(plan, fixture)).toBeNull();
      expect(absorbWebVitestCommandPlan(plan, null)).toBe(plan);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it.each([null, [], ['../escape.test.tsx'], ['src/a.test.tsx', 'src/a.test.tsx']])(
    'does not absorb without complete usable evidence: %j',
    (inventory) => {
      expect(
        selectUncoveredWebVitestFiles({
          suite: 'monaco',
          completeSuites: new Set(['presentation']),
          inventory,
        })
      ).toBeNull();
    }
  );

  it('does not treat exact Presentation tests as a complete primary witness', () => {
    expect(
      selectUncoveredWebVitestFiles({
        suite: 'monaco',
        completeSuites: new Set(),
        inventory: listWebVitestFiles(),
      })
    ).toBeNull();
  });

  it('preserves every focus obligation when execution configuration changes', () => {
    const create = runtimeConfig.createWebVitestConfig;
    vi.spyOn(runtimeConfig, 'createWebVitestConfig').mockImplementation((suite) => {
      const config = create(suite);
      if (suite === 'monaco') config.test!.isolate = false;
      return config;
    });
    expect(
      selectUncoveredWebVitestFiles({
        suite: 'monaco',
        completeSuites: new Set(['presentation']),
        inventory: listWebVitestFiles(),
      })
    ).toBeNull();
  });

  it.each([
    { label: 'function', values: [() => 'first', () => 'second'] },
    { label: 'RegExp', values: [/first/, /second/] },
    { label: 'Map', values: [new Map([['key', 1]]), new Map([['key', 2]])] },
    { label: 'undefined property', values: [{ key: undefined }, {}] },
  ])('retains focus execution for $label configuration divergence', ({ values }) => {
    const create = runtimeConfig.createWebVitestConfig;
    vi.spyOn(runtimeConfig, 'createWebVitestConfig').mockImplementation((suite) => {
      const config = create(suite);
      config.define = { coverageProbe: values[suite === 'monaco' ? 0 : 1] };
      return config;
    });
    expect(
      selectUncoveredWebVitestFiles({
        suite: 'monaco',
        completeSuites: new Set(['presentation']),
        inventory: listWebVitestFiles(),
      })
    ).toBeNull();
  });

  it('preserves the exact focus file/config union except identical Presentation executions', async () => {
    const sources = [
      'src/styles/index.css',
      'src/app/views/code/codeViewCopy.ts',
      'src/app/components/shell/appBuildMetadata.ts',
      'src/app/services/workspace/sourceObjectMetricEvidence.ts',
    ];
    const baseline = resolveWebVitestChangedSuitePlan(sources);
    const files = await readNativeCoverageInventory();
    const plan = absorbWebVitestCommandPlan(baseline, files);
    const residual = plan.commandPlan.filter((entry) => entry.kind === 'vitest-files');
    const expected = ['monaco', 'shell-session'] as const;
    expect(residual).toEqual(
      expected.map((suite) => ({
        kind: 'vitest-files',
        config: `vitest.${suite}.config.ts`,
        filePaths: files
          .filter(
            (file) => suiteMatchesFile(suite, file) && !suiteMatchesFile('presentation', file)
          )
          .sort((left, right) => left.localeCompare(right)),
      }))
    );
    expect(residual.flatMap((entry) => entry.filePaths)).toHaveLength(39);
    expect(plan.commands).toEqual(
      expect.arrayContaining([
        ...primaryCommands,
        WEB_VITEST_CHANGED_SUITE_COMMANDS['workspace-services'],
      ])
    );
    expect(
      absorbWebVitestCommandPlan(resolveWebVitestChangedSuitePlan([...sources].reverse()), files)
    ).toEqual(plan);
  });

  it.each([
    {
      sources: ['src/app/views/code/codeViewCopy.ts'],
      residual: [{ config: 'vitest.monaco.config.ts', files: 17 }],
    },
    {
      sources: [
        'src/app/components/shell/appBuildMetadata.ts',
        'src/app/services/workspace/sourceObjectMetricEvidence.ts',
      ],
      residual: [{ config: 'vitest.shell-session.config.ts', files: 22 }],
    },
  ])(
    'absorbs only identical Presentation executions for $sources',
    async ({ sources, residual }) => {
      const inventory = await readNativeCoverageInventory();
      vi.spyOn(coverageAdapter, 'readWebVitestCoverageInventory').mockReturnValueOnce(inventory);
      const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      main(['--plan', '--phase=vitest', '--files', 'src/styles/index.css', ...sources]);
      const plan = JSON.parse(String(output.mock.calls.at(-1)![0]));
      expect(
        plan.commandPlan
          .filter((entry: { kind: string }) => entry.kind === 'vitest-files')
          .map((entry: { config: string; filePaths: string[] }) => ({
            config: entry.config,
            files: entry.filePaths.length,
          }))
      ).toEqual(residual);
      expect(plan.commands).toEqual(expect.arrayContaining(primaryCommands));
      if (sources.length > 1)
        expect(plan.commands).toContain(WEB_VITEST_CHANGED_SUITE_COMMANDS['workspace-services']);
    }
  );

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
