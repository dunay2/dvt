// @vitest-environment node
/** @ownedConcern Preserve complete browser evidence across bounded CI shards. */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WEB_CYPRESS_SPECS,
  resolveWebCypressChangedPlan,
  selectWebCypressShard,
  type WebCypressCommand,
} from '../../cypress.changed';
import { main, parseChangedSuiteArgs } from '../../scripts/run-vitest-changed-suites';

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

describe.each(['available', 'controlled'] as const)('%s browser partition', (capability) => {
  const command = resolveWebCypressChangedPlan([], true).commands.find(
    (entry) => entry.capability === capability
  )!;
  const selectors = ['--phase=browser', `--browser-capability=${capability}`];

  it('executes the complete catalog exactly once across three ordered nonempty shards', () => {
    const shards = [1, 2, 3].map((index) => selectWebCypressShard(command, index));
    const union = shards.flatMap((shard) => shard?.specPaths ?? []);
    expect([...union].sort()).toEqual([...WEB_CYPRESS_SPECS[capability]].sort());
    expect(new Set(union).size).toBe(union.length);
    const sizes = shards.map((shard) => shard?.specPaths.length ?? 0);
    expect(Math.min(...sizes)).toBeGreaterThan(0);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    for (const [index, shard] of shards.entries()) {
      if (!shard) throw new Error('The complete catalog must fill every browser shard.');
      expect(shard.specPaths).toEqual(command.specPaths.filter((_, i) => i % 3 === index));
      expect(shard.command).toBe(
        capability === 'controlled'
          ? `pnpm run test:e2e:native --browser chrome --spec ${shard.specPaths.map((path) => path.slice('apps/web/'.length)).join(',')}`
          : `pnpm run test:e2e:selected-closure:live --spec ${shard.specPaths.join(',')}`
      );
      expect(shard.env).toEqual(command.env);
      expect(shard.capability).toBe(capability);
    }
  });

  it.each([0, 4, -1, 1.5, Number.NaN])('rejects invalid shard index %s', (index) => {
    expect(() => selectWebCypressShard(command, index)).toThrow(/shard/i);
  });

  it('rejects an empty source request instead of reporting success', () => {
    expect(() => selectWebCypressShard({ ...command, specPaths: [] }, 1)).toThrow(/empty/i);
  });

  it.each([1, 2, 3])('plans and executes exactly shard %s', (index) => {
    const args = [...selectors, `--browser-shard=${index}/3`, '--full', '--files', 'README.md'];
    const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    main(['--plan', ...args]);
    const plan = JSON.parse(String(output.mock.calls[0]![0]));
    expect(plan.browserCommands).toEqual([selectWebCypressShard(command, index)]);
    expect(spawnSync).not.toHaveBeenCalled();
    main(args);
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith(
      plan.browserCommands[0].command,
      expect.objectContaining({ env: expect.objectContaining(command.env) })
    );
    expect(parseChangedSuiteArgs(args).browserShard).toBe(index);
  });

  it.each([
    [...selectors, '--browser-shard=0/3'],
    [...selectors, '--browser-shard=4/3'],
    [...selectors, '--browser-shard=1/2'],
    [...selectors, '--browser-shard=01/3'],
    [...selectors, '--browser-shard=1/3', '--browser-shard=2/3'],
  ])('rejects malformed selectors %s', (...args) => {
    expect(() => parseChangedSuiteArgs(args)).toThrow();
  });

  it('validates consumers excluded from the shard before planning or executing', () => {
    const excluded = WEB_CYPRESS_SPECS[capability][1];
    if (!excluded) throw new Error('The browser catalog must cover multiple shards.');
    vi.mocked(existsSync).mockImplementation(
      (path) => !String(path).replaceAll('\\', '/').endsWith(excluded)
    );
    for (const plan of [[], ['--plan']]) {
      expect(() =>
        main([...plan, ...selectors, '--browser-shard=1/3', '--full', '--files', 'README.md'])
      ).toThrow(/existing consumer/);
    }
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it.each([
    ['apps/web/cypress/e2e/unknown.cy.ts', /not admitted/],
    [
      'apps/web/cypress/e2e/canvas/canvas-node-data-actions.cy.ts',
      /Retired browser evidence must remain absent/,
    ],
  ] as const)('rejects invalid consumer %s before shard filtering', (path, error) => {
    for (const plan of [[], ['--plan']]) {
      expect(() => main([...plan, ...selectors, '--browser-shard=3/3', '--files', path])).toThrow(
        error
      );
    }
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('does not allocate a browser when the complete plan has no browser obligation', () => {
    main([...selectors, '--browser-shard=1/3', '--files', 'README.md']);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});

it('leaves every unpartitioned local obligation unchanged', () => {
  for (const command of resolveWebCypressChangedPlan([], true).commands) {
    expect(selectWebCypressShard(command)).toBe(command);
  }
});

it('rejects unavailable and empty available partitions', () => {
  const commands = resolveWebCypressChangedPlan([], true).commands;
  const unavailable = commands.find((command) => command.capability === 'unavailable')!;
  const available = commands.find((command) => command.capability === 'available')!;
  expect(() => selectWebCypressShard(unavailable, 1)).toThrow(/capability/);
  expect(() =>
    selectWebCypressShard({ ...available, specPaths: available.specPaths.slice(0, 1) }, 3)
  ).toThrow(/empty/i);
});

it.each([
  ['--phase=vitest', '--browser-shard=1/3'],
  ['--phase=browser', '--browser-capability=unavailable', '--browser-shard=1/3'],
  ['--phase=browser', '--browser-shard=1/3'],
])('rejects incompatible selectors %s', (...args) => {
  expect(() => parseChangedSuiteArgs(args)).toThrow();
});

it.each([1, 2])('covers %s changed controlled specs without empty browser execution', (count) => {
  const files = WEB_CYPRESS_SPECS.controlled.slice(0, count);
  const selected = resolveWebCypressChangedPlan(files).commands[0]!;
  const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const assigned: string[] = [];
  vi.stubEnv('GITHUB_OUTPUT', 'controlled-shard-output');
  for (const index of [1, 2, 3]) {
    vi.clearAllMocks();
    const args = [
      '--phase=browser',
      '--browser-capability=controlled',
      `--browser-shard=${index}/3`,
      '--files',
      ...files,
    ];
    main(['--plan', ...args]);
    const plan: { browserCommands: WebCypressCommand[] } = JSON.parse(
      String(output.mock.calls[0]![0])
    );
    const shard = selectWebCypressShard(selected, index);
    expect(plan.browserCommands).toEqual(shard ? [shard] : []);
    expect(appendFileSync).toHaveBeenCalledWith(
      'controlled-shard-output',
      `browser_required=${index <= count}\nprovider_required=false\n`
    );
    expect(spawnSync).not.toHaveBeenCalled();
    main(args);
    expect(spawnSync).toHaveBeenCalledTimes(index <= count ? 1 : 0);
    assigned.push(...plan.browserCommands.flatMap((command) => command.specPaths));
  }
  expect(assigned).toEqual(files);
  expect(new Set(assigned).size).toBe(files.length);
});

it('rejects a missing controlled consumer even when its requested partition is unassigned', () => {
  const selected = WEB_CYPRESS_SPECS.controlled[0]!;
  vi.mocked(existsSync).mockImplementation(
    (path) => !String(path).replaceAll('\\', '/').endsWith(selected)
  );
  vi.stubEnv('GITHUB_OUTPUT', 'controlled-shard-output');
  for (const plan of [[], ['--plan']]) {
    expect(() =>
      main([
        ...plan,
        '--phase=browser',
        '--browser-capability=controlled',
        '--browser-shard=3/3',
        '--files',
        selected,
      ])
    ).toThrow(/existing consumer/);
  }
  expect(spawnSync).not.toHaveBeenCalled();
  expect(appendFileSync).not.toHaveBeenCalled();
});
