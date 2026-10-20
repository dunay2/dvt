/** Owned concern: reject catalog changes that withdraw existing browser evidence. */
import { execFileSync, spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveControlledCatalogAdditions,
  WEB_CYPRESS_CATALOG as current,
  WEB_CYPRESS_CATALOG_PATH,
} from '../../cypress.catalog';
import { main } from '../../scripts/run-vitest-changed-suites';
import { resolveWebVitestChangedSuitePlan } from '../../vitest.suites';

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFileSync: vi.fn(),
  spawnSync: vi.fn(),
}));

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const priorSpec = 'apps/web/cypress/e2e/canvas/prior-evidence.cy.ts';
const groups = ['controlled', 'available', 'unavailable', 'nightly'] as const;

describe('Browser catalog retention', () => {
  it.each(groups)('rejects removing a prior %s member from the complete plan', (group) => {
    const base = { ...current, [group]: [...current[group], priorSpec] };
    for (const full of [false, true]) {
      expect(() =>
        resolveWebVitestChangedSuitePlan([WEB_CYPRESS_CATALOG_PATH], {
          full,
          catalogSnapshots: { base, head: current },
        })
      ).toThrow(priorSpec);
    }
  });

  it.each([
    ['available', 'controlled'],
    ['controlled', 'available'],
    ['controlled', 'nightly'],
    ['nightly', 'controlled'],
  ] as const)('rejects reclassifying a member from %s to %s', (from, to) => {
    const base = { ...current, [from]: [...current[from], priorSpec] };
    const head = { ...current, [to]: [...current[to], priorSpec] };
    expect(() => resolveControlledCatalogAdditions(head, { base, head })).toThrow(priorSpec);
  });

  it('rejects a destructive HEAD even when the executed catalog restores the base', () => {
    const head = { ...current, controlled: current.controlled.slice(1) };
    expect(() =>
      resolveControlledCatalogAdditions(current, { base: current, head, dirty: true })
    ).toThrow(current.controlled[0]!);
  });

  it('retains a valid base even without a usable HEAD witness', () => {
    const base = { ...current, nightly: [...current.nightly, priorSpec] };
    expect(() =>
      resolveControlledCatalogAdditions(current, { base, head: null, dirty: true })
    ).toThrow(priorSpec);
  });

  it.each([current, null])(
    'retains HEAD additions against dirty execution with base %#',
    (base) => {
      const head = { ...current, controlled: [...current.controlled, priorSpec] };
      expect(() => resolveControlledCatalogAdditions(current, { base, head, dirty: true })).toThrow(
        priorSpec
      );
    }
  );

  it.each([
    { base: null, head: current },
    { base: { ...current, controlled: [...current.controlled].reverse() }, head: current },
    { base: { ...current, available: current.available.slice(1) }, head: current },
    { base: current, head: current, dirty: true },
  ])('preserves the ordinary baseline for nondestructive fallback %#', (catalogSnapshots) => {
    const plan = resolveWebVitestChangedSuitePlan([WEB_CYPRESS_CATALOG_PATH], { catalogSnapshots });
    expect(plan.browserCommands.flatMap(({ specPaths }) => specPaths)).toEqual(
      groups.filter((group) => group !== 'nightly').flatMap((group) => current[group])
    );
    expect(plan.browserFiles).toEqual(expect.arrayContaining([...current.nightly]));
  });
});

describe('Retention before execution filtering', () => {
  it.each([
    ['--plan'],
    ['--plan', '--full'],
    ['--phase=vitest'],
    ['--full', '--phase=browser', '--browser-capability=controlled'],
    ['--phase=browser', '--browser-capability=available', '--browser-shard=2/3'],
  ])('rejects withdrawn evidence before selecting commands for %j', (...flags) => {
    const base = { ...current, nightly: [...current.nightly, priorSpec] };
    vi.stubEnv('GIT_BASE', 'base');
    vi.stubEnv('GIT_HEAD', 'head');
    vi.stubEnv('GITHUB_OUTPUT', '');
    vi.mocked(execFileSync).mockImplementation((_command, args) => {
      const parts = args as string[];
      if (parts[0] === 'rev-parse')
        return parts.at(-1) === 'base^{commit}' ? 'base-sha' : 'head-sha';
      if (parts[0] === 'ls-tree') return `${WEB_CYPRESS_CATALOG_PATH}\0`;
      if (parts[0] === 'show')
        return JSON.stringify(parts[1]!.startsWith('base-sha:') ? base : current);
      return '';
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    expect(() => main([...flags, '--files', WEB_CYPRESS_CATALOG_PATH])).toThrow(priorSpec);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
