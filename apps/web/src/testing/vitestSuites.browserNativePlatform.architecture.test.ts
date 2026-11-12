/** Owned concern: preserve declared native browser obligations inside the complete admission plan. */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  parseWebCypressCatalog,
  resolveControlledCatalogAdditions,
  WEB_CYPRESS_CATALOG,
} from '../../cypress.catalog';
import {
  resolveWebCypressChangedPlan,
  selectWebCypressLocalReadiness,
} from '../../cypress.changed';
import { parseChangedSuiteArgs } from '../../scripts/changed-suite-args';
import { main } from '../../scripts/run-vitest-changed-suites';
import { retired } from './vitestSuites.browserRouting.fixtures';

vi.mock('node:child_process', async () => ({
  ...(await vi.importActual<typeof import('node:child_process')>('node:child_process')),
  spawnSync: vi.fn(() => ({ status: 0 })),
}));
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

const windowsSpec = 'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts';
const current = WEB_CYPRESS_CATALOG;

describe('Declared native browser obligations', () => {
  it('retains the real Windows Monaco proof without changing complete or hosted membership', () => {
    expect(current.nativePlatforms.win32).toEqual([windowsSpec]);
    const complete = resolveWebCypressChangedPlan([], true).commands;
    const admittedSpecs = [...current.controlled, ...current.available, ...current.unavailable];
    expect(complete.map((entry) => entry.capability)).toEqual([
      'controlled',
      'available',
      'unavailable',
    ]);
    expect(complete.flatMap((entry) => entry.specPaths)).toEqual(admittedSpecs);
    const native = complete.flatMap((entry) => {
      const selected = selectWebCypressLocalReadiness(entry, 'win32', []);
      return selected ? [selected] : [];
    });
    expect(native).toMatchObject([{ capability: 'controlled', specPaths: [windowsSpec] }]);
    expect(native[0]!.command).toContain(windowsSpec.slice('apps/web/'.length));
    expect(complete.flatMap((entry) => entry.specPaths)).toEqual(admittedSpecs);
    expect(
      complete.every((entry) => selectWebCypressLocalReadiness(entry, 'linux', []) === undefined)
    ).toBe(true);
  });

  it('does not add the native spec when the complete plan did not select it', () => {
    const command = resolveWebCypressChangedPlan([current.controlled[0]!]).commands[0]!;
    expect(selectWebCypressLocalReadiness(command, 'win32', [])).toBeUndefined();
  });

  it.each([
    ['win32', 'available'],
    ['linux', 'available'],
    ['win32', 'unavailable'],
    ['linux', 'unavailable'],
  ] as const)('retains changed scenarios and %s/%s LIVE semantics', (platform, capability) => {
    const changed = current[capability][0]!;
    const command = resolveWebCypressChangedPlan([changed]).commands[0]!;
    const retained = selectWebCypressLocalReadiness(command, platform, [
      changed,
      changed.slice('apps/web/'.length),
    ]);
    expect(retained).toMatchObject({ capability, specPaths: [changed], env: command.env });
    expect(retained!.command).toContain('test:e2e:selected-closure:live');
    expect(command.specPaths).toEqual(current[capability]);
    const native = resolveWebCypressChangedPlan([windowsSpec]).commands[0]!;
    expect(selectWebCypressLocalReadiness(native, platform, [windowsSpec])!.specPaths).toEqual([
      windowsSpec,
    ]);
  });

  it('passes the original changed frontier to readiness without changing the explicit complete phase', () => {
    const files = [current.controlled[0]!];
    vi.mocked(spawnSync).mockClear();
    main(['--phase=push-readiness', '--files', ...files]);
    expect(vi.mocked(spawnSync).mock.calls.map(([command]) => command)).toEqual([
      resolveWebCypressChangedPlan(files).commands[0]!.command,
    ]);
    expect(resolveWebCypressChangedPlan(files).commands[0]!.specPaths).toEqual(files);
    const readinessCalls = [...vi.mocked(spawnSync).mock.calls];
    vi.mocked(spawnSync).mockClear();
    main(['--files', ...files]);
    expect(vi.mocked(spawnSync).mock.calls).toEqual(readinessCalls);
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
      const selected = selectWebCypressLocalReadiness(entry, process.platform, files);
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

  it('rejects missing or reappeared retired paths before an empty readiness projection', async () => {
    const { existsSync: actual } = await vi.importActual<typeof import('node:fs')>('node:fs');
    const missing = current.available[0]!;
    for (const path of [missing, retired]) {
      vi.mocked(spawnSync).mockClear();
      vi.mocked(existsSync).mockImplementation((candidate) =>
        String(candidate).replaceAll('\\', '/').endsWith(path.slice('apps/web/'.length))
          ? path === retired
          : actual(candidate)
      );
      try {
        expect(() => main(['--phase=push-readiness', '--files', path])).toThrow(
          /existing|retired/i
        );
        expect(spawnSync).not.toHaveBeenCalled();
      } finally {
        vi.mocked(existsSync).mockImplementation(actual);
      }
    }
  });

  it('preserves complete execution on unsupported hosts and the separate nightly cadence', () => {
    const command = resolveWebCypressChangedPlan([windowsSpec]).commands[0]!;
    expect(selectWebCypressLocalReadiness(command, 'darwin', [])).toBe(command);
    vi.mocked(spawnSync).mockClear();
    main(['--phase=vitest', '--files', ...current.nightly]);
    const guardCalls = [...vi.mocked(spawnSync).mock.calls];
    vi.mocked(spawnSync).mockClear();
    main(['--phase=push-readiness', '--files', ...current.nightly]);
    expect(vi.mocked(spawnSync).mock.calls).toEqual(guardCalls);
    expect(resolveWebCypressChangedPlan(current.nightly).commands).toEqual([]);
  });
});
