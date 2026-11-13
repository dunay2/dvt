// @vitest-environment node
/** Owned concern: carry verified catalog evidence through the real local execution adapter. */
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WEB_CYPRESS_CATALOG as catalog,
  WEB_CYPRESS_CATALOG_PATH as catalogPath,
} from '../../cypress.catalog';
import {
  readBrowserCatalogSnapshots,
  readChangedFiles,
  readGitComparison,
} from '../../scripts/changed-suite-git';
import { main } from '../../scripts/run-vitest-changed-suites';
import { resolveWebEvidenceEnvironment } from '../../scripts/web-evidence-environment';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { WEB_VITEST_GOVERNANCE_TEST_PATHS } from '../../vitest/paths';

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawnSync: vi.fn(() => ({ status: 0 })),
}));
vi.mock('../../scripts/changed-suite-git', () => ({
  readBrowserCatalogSnapshots: vi.fn(),
  readChangedFiles: vi.fn(),
  readGitComparison: vi.fn(),
}));
vi.mock('../../scripts/web-evidence-environment', () => ({
  resolveWebEvidenceEnvironment: vi.fn(
    (_commands: Parameters<typeof resolveWebEvidenceEnvironment>[0], env: NodeJS.ProcessEnv) => env
  ),
}));

const added = catalog.controlled.at(-1)!;
const previous = { ...catalog, controlled: catalog.controlled.slice(0, -1) };
const snapshots = { base: previous, head: catalog };
const comparison = { GIT_BASE: 'a'.repeat(40), GIT_HEAD: 'b'.repeat(40) };
const allSpecs = [...catalog.controlled, ...catalog.available, ...catalog.unavailable];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readBrowserCatalogSnapshots).mockReset().mockReturnValue(snapshots);
  vi.mocked(readChangedFiles).mockReset().mockReturnValue([catalogPath]);
  vi.mocked(readGitComparison).mockReset().mockReturnValue(comparison);
  vi.mocked(resolveWebEvidenceEnvironment)
    .mockReset()
    .mockImplementation((_commands, env) => env);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.stubEnv('CI', 'false');
  vi.stubEnv('GITHUB_OUTPUT', '');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function planned(
  extra: readonly string[] = [],
  files: readonly string[] = [catalogPath]
): ReturnType<typeof resolveWebVitestChangedSuitePlan> {
  vi.mocked(process.stdout.write).mockClear();
  main(['--plan', '--phase=push-readiness', ...extra, '--files', ...files]);
  return JSON.parse(
    vi
      .mocked(process.stdout.write)
      .mock.calls.map(([chunk]) => chunk)
      .join('')
  ) as ReturnType<typeof resolveWebVitestChangedSuitePlan>;
}

function expectComplete(plan: ReturnType<typeof resolveWebVitestChangedSuitePlan>): void {
  const specs = plan.browserCommands.flatMap((entry) => entry.specPaths);
  expect(specs).toHaveLength(allSpecs.length);
  expect(specs).toEqual(expect.arrayContaining(allSpecs));
  expect(plan.browserCommands.map((entry) => entry.capability)).toEqual([
    'controlled',
    'controlled',
    'controlled',
    'available',
    'unavailable',
  ]);
}

describe('catalog admission at the local execution boundary', () => {
  it('runs a catalog-only addition even though its existing file is not in the changed frontier', () => {
    main(['--phase=push-readiness', '--files', catalogPath]);
    const complete = resolveWebVitestChangedSuitePlan([catalogPath], {
      catalogSnapshots: snapshots,
    });
    expect(complete.browserCommands[0]!.specPaths).toEqual([added]);
    expect(vi.mocked(spawnSync).mock.calls.map(([command]) => command)).toContain(
      complete.browserCommands[0]!.command
    );
    expect(vi.mocked(resolveWebEvidenceEnvironment).mock.calls[0]![0]).toEqual(
      complete.browserCommands
    );
  });

  it('distinguishes absent, empty and additive evidence without changing the frontier', () => {
    expect(planned().catalogAdditions).toEqual([added]);
    vi.mocked(readBrowserCatalogSnapshots).mockReturnValue({ base: catalog, head: catalog });
    expect(planned().catalogAdditions).toEqual([]);
    const ordinary = planned([], ['apps/web/src/app/views/CodeView.tsx']);
    expect(Object.hasOwn(ordinary, 'catalogAdditions')).toBe(false);
    expect(readChangedFiles).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', { base: null, head: catalog }],
    ['malformed', { base: [], head: catalog }],
    ['dirty', { ...snapshots, dirty: true }],
    ['execution mismatch', { base: previous, head: previous }],
    [
      'reordered',
      { base: { ...catalog, controlled: [...catalog.controlled].reverse() }, head: catalog },
    ],
    [
      'native metadata',
      {
        base: {
          ...previous,
          nativePlatforms: {
            ...catalog.nativePlatforms,
            win32: catalog.nativePlatforms.win32?.slice(0, 1) ?? [],
          },
        },
        head: catalog,
      },
    ],
    [
      'LIVE membership',
      { base: { ...previous, available: catalog.available.slice(1) }, head: catalog },
    ],
  ] as const)(
    'retains all capabilities when the %s witness cannot prove additive-only scope',
    (_name, witness) => {
      vi.mocked(readBrowserCatalogSnapshots).mockReturnValue(witness);
      const plan = planned();
      expect(plan.catalogAdditions).toBeNull();
      expectComplete(plan);
    }
  );

  it('retains catalog order and deduplicates changed, native and catalog-added scenarios', () => {
    const changed = catalog.controlled[0]!;
    const native =
      Object.entries(catalog.nativePlatforms).find(
        ([platform]) => platform === process.platform
      )?.[1] ?? [];
    const plan = planned(
      [],
      [catalogPath, 'apps/web/src/app/bootstrap/AuthRouteGate.tsx', changed, added, catalogPath]
    );
    expect(plan.browserCommands.flatMap((entry) => entry.specPaths)).toEqual(
      catalog.controlled.filter((spec) => [changed, added, ...native].includes(spec))
    );
  });

  it('preserves complete explicit planning despite a valid additive witness', () => {
    expectComplete(planned(['--full']));
  });

  it('rejects catalog withdrawal before prerequisite acquisition or child execution', () => {
    vi.mocked(readBrowserCatalogSnapshots).mockReturnValue({ base: catalog, head: previous });
    expect(() => main(['--phase=push-readiness', '--files', catalogPath])).toThrow(
      /remove|reclassify/i
    );
    expect(resolveWebEvidenceEnvironment).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('acquires fallback LIVE prerequisites before any proof or dependency process', () => {
    vi.mocked(readBrowserCatalogSnapshots).mockReturnValue({ ...snapshots, dirty: true });
    vi.mocked(resolveWebEvidenceEnvironment).mockImplementation((commands, env) => {
      if (commands.some((entry) => entry.capability !== 'controlled'))
        throw new Error('provider prerequisite unavailable');
      return env;
    });
    expect(() => main(['--phase=push-readiness', '--files', catalogPath])).toThrow(
      'provider prerequisite unavailable'
    );
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('uses the pinned comparison for ordinary discovery and the catalog witness', () => {
    main(['--plan', '--phase=push-readiness']);
    expect(readChangedFiles).toHaveBeenCalledWith(expect.any(String), { env: comparison });
    expect(readBrowserCatalogSnapshots).toHaveBeenCalledWith(expect.any(String), {
      env: comparison,
    });
  });

  it('is retained in the existing mandatory router guard batch', () => {
    expect(WEB_VITEST_GOVERNANCE_TEST_PATHS).toContain(
      'src/testing/vitestSuites.browserCatalogReadiness.architecture.test.ts'
    );
  });
});
