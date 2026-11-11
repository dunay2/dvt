/** Owned concern: retain complete Web obligations when hosted execution is partitioned. */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseSequencer, createVitest } from 'vitest/node';
import { main, parseChangedSuiteArgs } from '../../scripts/run-vitest-changed-suites';
import {
  selectWebVitestExecutionPartition,
  WEB_VITEST_EXECUTION_GROUPS,
} from '../../scripts/vitest-execution-partitions';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { WEB_VITEST_CHANGED_SUITE_COMMANDS } from '../../vitest/commands';
import { listWebVitestFiles, suiteMatchesFile, webRoot } from './vitestSuites.architecture.support';

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawnSync: vi.fn(() => ({ status: 0 })),
}));
vi.mock('node:fs', async (original) => ({
  ...(await original<typeof import('node:fs')>()),
  appendFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(existsSync).mockImplementation(() => true);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('complete execution partition coverage', () => {
  it.each(
    [
      [
        'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts',
      ],
      [
        'apps/web/src/app/views/canvas/CanvasModelIdentityField.tsx',
        'apps/web/src/app/views/canvas/canvasModelIdentity.test.ts',
        'apps/web/src/app/views/code/CodeView.persistence.test.tsx',
      ],
      [
        'apps/web/src/app/views/canvas/CanvasModelIdentityField.tsx',
        'apps/web/src/app/views/canvas/CanvasModelIdentityField.test.tsx',
      ],
      ['README.md'],
    ].map((files) => [files])
  )('preserves every obligation exactly once for %j', (files) => {
    const { commandPlan } = resolveWebVitestChangedSuitePlan(files);
    const before = structuredClone(commandPlan);
    const union = WEB_VITEST_EXECUTION_GROUPS.flatMap((group) =>
      selectWebVitestExecutionPartition(commandPlan, group)
    );
    const expected = commandPlan.flatMap((entry) =>
      entry.kind === 'shell' && entry.command === WEB_VITEST_CHANGED_SUITE_COMMANDS.presentation
        ? [1, 2, 3].map((index) => ({ ...entry, command: `${entry.command} --shard=${index}/3` }))
        : [entry]
    );
    const keys = (entries: typeof union): string[] =>
      entries.map((entry) => JSON.stringify(entry)).sort();
    expect(keys(union)).toEqual(keys(expected));
    expect(new Set(keys(union)).size).toBe(union.length);
    expect(commandPlan).toEqual(before);
    expect(selectWebVitestExecutionPartition(commandPlan)).toBe(commandPlan);
  });

  // Exercise the installed sequencer and real discovery, so native thirds cannot lose a test file.
  it('retains the complete real Presentation inventory across the three native shards', async () => {
    const context = await createVitest('test', {
      root: webRoot,
      config: 'vitest.presentation.config.ts',
      watch: false,
    });
    try {
      const specifications = await context.globTestSpecifications();
      const groups: string[][] = [];
      for (const index of [1, 2, 3]) {
        context.config.shard = { index, count: 3 };
        const shard = await new BaseSequencer(context).shard(specifications);
        groups.push(
          shard.map((spec) =>
            spec.moduleId.replaceAll('\\', '/').slice(webRoot.replaceAll('\\', '/').length + 1)
          )
        );
      }
      const union = groups.flat();
      expect(groups.every((group) => group.length > 0)).toBe(true);
      expect(new Set(union).size).toBe(union.length);
      expect(union.sort()).toEqual(
        listWebVitestFiles()
          .filter((file) => suiteMatchesFile('presentation', file))
          .sort()
      );
    } finally {
      await context.close();
    }
  });
});

describe('hosted Vitest execution partition admission', () => {
  // PRs must use the existing full-run groups without paying a sequential complete plan per job.
  it.each([
    'unit',
    'architecture',
    'presentation-1',
    'presentation-2',
    'presentation-3',
    'changed',
  ])('admits the %s execution group after an explicit Vitest phase', (group) => {
    expect(parseChangedSuiteArgs(['--phase=vitest', `--vitest-group=${group}`])).toMatchObject({
      phase: 'vitest',
      vitestGroup: group,
    });
  });

  // A typo or phase mismatch must fail, never silently run an incomplete proof.
  it.each(
    [
      ['--phase=vitest', '--vitest-group=unknown'],
      ['--phase=vitest', '--vitest-group=unit', '--vitest-group=unit'],
      ['--phase=browser', '--vitest-group=unit'],
      ['--vitest-group=unit'],
    ].map((args) => [args])
  )('rejects invalid execution selectors %j', (args) => {
    expect(() => parseChangedSuiteArgs(args)).toThrow();
  });

  it('reports an empty group without building or executing dependencies', () => {
    vi.stubEnv('CI', 'true');
    vi.stubEnv('GITHUB_OUTPUT', 'job-output');
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const args = [
      '--phase=vitest',
      '--vitest-group=unit',
      '--files',
      'apps/web/src/app/views/canvas/CanvasModelIdentityField.test.tsx',
    ];
    main(['--plan', ...args]);
    expect(appendFileSync).toHaveBeenCalledWith(
      'job-output',
      expect.stringContaining('vitest_required=false')
    );
    main(args);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  // Each hosted adapter must launch its own slice, never replay the complete plan per job.
  it.each([
    {
      group: 'unit',
      files: ['apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts'],
      command: 'pnpm run test:unit:run',
    },
    {
      group: 'presentation-2',
      files: ['apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'],
      command: 'pnpm run test:presentation:run --shard=2/3',
    },
    {
      group: 'changed',
      files: ['apps/web/src/app/views/canvas/CanvasModelIdentityField.tsx'],
      command: 'pnpm run test:canvas-presentation:run',
    },
  ])('executes only the nonempty $group command', ({ group, files, command }) => {
    vi.stubEnv('CI', 'true');
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    main(['--phase=vitest', `--vitest-group=${group}`, '--files', ...files]);
    expect(vi.mocked(spawnSync).mock.calls.map(([launched]) => launched)).toEqual([
      'pnpm run test:deps',
      command,
    ]);
  });

  // Choosing an empty Vitest group cannot hide a missing browser consumer in the complete plan.
  it('validates all admitted paths before selecting an execution group', () => {
    const spec = 'apps/web/cypress/e2e/canvas/canvas-source-inspector-order.cy.ts';
    vi.mocked(existsSync).mockImplementation(
      (path) => !String(path).replaceAll('\\', '/').endsWith(spec)
    );
    expect(() =>
      main(['--plan', '--phase=vitest', '--vitest-group=unit', '--files', spec])
    ).toThrow(/requires an existing consumer/);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
