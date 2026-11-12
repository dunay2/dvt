/** Owned concern: preserve declared native browser obligations inside the complete admission plan. */
import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import {
  parseWebCypressCatalog,
  resolveControlledCatalogAdditions,
  WEB_CYPRESS_CATALOG,
} from '../../cypress.catalog';
import {
  resolveWebCypressChangedPlan,
  selectWebCypressNativePlatform,
} from '../../cypress.changed';
import { parseChangedSuiteArgs } from '../../scripts/changed-suite-args';
import { main } from '../../scripts/run-vitest-changed-suites';

vi.mock('node:child_process', async () => ({
  ...(await vi.importActual<typeof import('node:child_process')>('node:child_process')),
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

const windowsSpec = 'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts';
const coarsePointerSpec = 'apps/web/cypress/e2e/shell/canvas-workbench-coarse-pointer.cy.ts';
const windowsSpecs = [coarsePointerSpec, windowsSpec];
const current = WEB_CYPRESS_CATALOG;

describe('Declared native browser obligations', () => {
  it('retains the real Windows Monaco proof without changing complete or hosted membership', () => {
    expect(current.nativePlatforms.win32).toEqual(windowsSpecs);
    const complete = resolveWebCypressChangedPlan([], true).commands;
    const admittedSpecs = [...current.controlled, ...current.available, ...current.unavailable];
    expect(complete.map((entry) => entry.capability)).toEqual([
      'controlled',
      'available',
      'unavailable',
    ]);
    expect(complete.flatMap((entry) => entry.specPaths)).toEqual(admittedSpecs);
    const native = complete.flatMap((entry) => {
      const selected = selectWebCypressNativePlatform(entry, 'win32');
      return selected ? [selected] : [];
    });
    expect(native).toMatchObject([{ capability: 'controlled', specPaths: windowsSpecs }]);
    for (const spec of windowsSpecs) {
      expect(native[0]!.command).toContain(spec.slice('apps/web/'.length));
    }
    expect(complete.flatMap((entry) => entry.specPaths)).toEqual(admittedSpecs);
    expect(
      complete.every((entry) => selectWebCypressNativePlatform(entry, 'linux') === undefined)
    ).toBe(true);
  });

  it('does not add the native spec when the complete plan did not select it', () => {
    const command = resolveWebCypressChangedPlan([current.controlled[0]!]).commands[0]!;
    expect(selectWebCypressNativePlatform(command, 'win32')).toBeUndefined();
  });

  it.each([
    { win32: ['apps/web/cypress/e2e/missing.cy.ts'] },
    { win32: [windowsSpec, windowsSpec] },
    { win32: ['../escape.cy.ts'] },
    { win32: current.nightly },
    { notAPlatform: [windowsSpec] },
    { win32: 'not-an-array' },
    [],
    null,
  ])(
    'rejects unowned, duplicate, invalid or malformed native declarations %#',
    (nativePlatforms) => {
      expect(() => parseWebCypressCatalog({ ...current, nativePlatforms })).toThrow(/catalog/i);
    }
  );

  it('rejects platform withdrawal even when capability membership is unchanged', () => {
    const withdrawn = { ...current, nativePlatforms: {} };
    expect(() =>
      resolveControlledCatalogAdditions(withdrawn, { base: current, head: withdrawn })
    ).toThrow(/native|platform/i);
  });

  it('reads historical witnesses without losing capability retention or admitting metadata as additive', () => {
    const { nativePlatforms: _native, ...historical } = current;
    expect(
      resolveControlledCatalogAdditions(current, { base: historical, head: current })
    ).toBeNull();
    const removed = {
      ...historical,
      controlled: historical.controlled.slice(1),
      nativePlatforms: current.nativePlatforms,
    };
    expect(() =>
      resolveControlledCatalogAdditions(removed, { base: historical, head: removed })
    ).toThrow(/remove|reclassify/i);
  });

  it('admits exactly one readiness phase without capability or shard narrowing', () => {
    expect(parseChangedSuiteArgs(['--phase=push-readiness']).phase).toBe('push-readiness');
    expect(parseChangedSuiteArgs([]).phase).toBe('all');
    for (const tail of [
      ['--phase=vitest'],
      ['--browser-capability=controlled'],
      ['--browser-shard=1/3'],
      ['--vitest-group=unit'],
    ]) {
      expect(() => parseChangedSuiteArgs(['--phase=push-readiness', ...tail])).toThrow();
    }
  });

  it('executes the identical Vitest plan followed only by selected native host commands', () => {
    const files = ['apps/web/cypress/support/canvasDraftAuthoring.ts'];
    vi.mocked(spawnSync).mockClear();
    main(['--phase=vitest', '--files', ...files]);
    const vitestCalls = [...vi.mocked(spawnSync).mock.calls];
    vi.mocked(spawnSync).mockClear();
    main(['--phase=push-readiness', '--files', ...files]);
    const readinessCalls = [...vi.mocked(spawnSync).mock.calls];
    const native = resolveWebCypressChangedPlan(files).commands.flatMap((entry) => {
      const selected = selectWebCypressNativePlatform(entry, process.platform);
      return selected ? [selected] : [];
    });
    expect(readinessCalls.slice(0, vitestCalls.length)).toEqual(vitestCalls);
    expect(readinessCalls.slice(vitestCalls.length).map(([command]) => command)).toEqual(
      native.map((entry) => entry.command)
    );
  });

  it('cannot hide invalid consumers behind the readiness filter', () => {
    vi.mocked(spawnSync).mockClear();
    expect(() =>
      main(['--phase=push-readiness', '--files', 'apps/web/cypress/e2e/not-admitted.cy.ts'])
    ).toThrow(/not admitted/);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
