// @vitest-environment node
/** @ownedConcern Preserve complete available browser evidence across bounded CI shards. */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WEB_CYPRESS_SPECS,
  resolveWebCypressChangedPlan,
  selectWebCypressShard,
} from '../../cypress.changed';
import { main, parseChangedSuiteArgs } from '../../scripts/run-vitest-changed-suites';

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawnSync: vi.fn(() => ({ status: 0 })),
}));
vi.mock('node:fs', async (original) => ({
  ...(await original<typeof import('node:fs')>()),
  existsSync: vi.fn(() => true),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(existsSync).mockImplementation(() => true);
  vi.restoreAllMocks();
});

const available = resolveWebCypressChangedPlan([], true).commands.find(
  (command) => command.capability === 'available'
)!;
const selectors = ['--phase=browser', '--browser-capability=available'];

describe('Available browser partition policy', () => {
  it('executes the complete catalog exactly once across three ordered nonempty shards', () => {
    const shards = [1, 2, 3].map((index) => selectWebCypressShard(available, index));
    const union = shards.flatMap((shard) => shard.specPaths);
    expect([...union].sort()).toEqual([...WEB_CYPRESS_SPECS.available].sort());
    expect(new Set(union).size).toBe(union.length);
    const sizes = shards.map((shard) => shard.specPaths.length);
    expect(Math.min(...sizes)).toBeGreaterThan(0);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    for (const [index, shard] of shards.entries()) {
      expect(shard.specPaths).toEqual(available.specPaths.filter((_, i) => i % 3 === index));
      expect(shard.command).toBe(
        `pnpm run test:e2e:selected-closure:live --spec ${shard.specPaths.join(',')}`
      );
      expect(shard.env).toEqual(available.env);
      expect(shard.capability).toBe('available');
    }
  });

  it('leaves every unpartitioned local obligation unchanged', () => {
    for (const command of resolveWebCypressChangedPlan([], true).commands) {
      expect(selectWebCypressShard(command)).toBe(command);
    }
  });

  it.each([0, 4, -1, 1.5, Number.NaN])('rejects invalid shard index %s', (index) => {
    expect(() => selectWebCypressShard(available, index)).toThrow(/shard/i);
  });

  it('rejects nonavailable and empty partitions instead of reporting success', () => {
    for (const command of resolveWebCypressChangedPlan([], true).commands) {
      if (command.capability !== 'available') {
        expect(() => selectWebCypressShard(command, 1)).toThrow(/available/);
      }
    }
    expect(() => selectWebCypressShard({ ...available, specPaths: [] }, 1)).toThrow(/empty/i);
  });
});

describe('Changed-suite shard adapter', () => {
  it.each([1, 2, 3])('plans and executes exactly shard %s', (index) => {
    const args = [...selectors, `--browser-shard=${index}/3`, '--full', '--files', 'README.md'];
    const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    main(['--plan', ...args]);
    const plan = JSON.parse(String(output.mock.calls[0]![0]));
    expect(plan.browserCommands).toEqual([selectWebCypressShard(available, index)]);
    expect(spawnSync).not.toHaveBeenCalled();
    main(args);
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith(
      plan.browserCommands[0].command,
      expect.objectContaining({ env: expect.objectContaining(available.env) })
    );
    expect(parseChangedSuiteArgs(args).browserShard).toBe(index);
  });

  it.each([
    [...selectors, '--browser-shard=0/3'],
    [...selectors, '--browser-shard=4/3'],
    [...selectors, '--browser-shard=1/2'],
    [...selectors, '--browser-shard=01/3'],
    [...selectors, '--browser-shard=1/3', '--browser-shard=2/3'],
    ['--phase=vitest', '--browser-shard=1/3'],
    ['--phase=browser', '--browser-capability=controlled', '--browser-shard=1/3'],
    ['--phase=browser', '--browser-capability=unavailable', '--browser-shard=1/3'],
    ['--phase=browser', '--browser-shard=1/3'],
  ])('rejects malformed or incompatible selectors %s', (...args) => {
    expect(() => parseChangedSuiteArgs(args)).toThrow();
  });

  it('validates consumers excluded from the shard before planning or executing', () => {
    const excluded = WEB_CYPRESS_SPECS.available[1];
    if (!excluded) throw new Error('The available browser catalog must cover multiple shards.');
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

  it('cannot hide an unknown consumer behind an available shard', () => {
    expect(() =>
      main([
        ...selectors,
        '--browser-shard=1/3',
        '--plan',
        '--files',
        'apps/web/cypress/e2e/unknown.cy.ts',
      ])
    ).toThrow(/not admitted/);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('rejects a restored retired consumer before shard filtering', () => {
    expect(() =>
      main([
        ...selectors,
        '--browser-shard=1/3',
        '--plan',
        '--files',
        'apps/web/cypress/e2e/canvas/canvas-node-data-actions.cy.ts',
      ])
    ).toThrow(/Retired browser evidence must remain absent/);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('does not allocate a browser when the complete plan has no browser obligation', () => {
    main([...selectors, '--browser-shard=1/3', '--files', 'README.md']);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
