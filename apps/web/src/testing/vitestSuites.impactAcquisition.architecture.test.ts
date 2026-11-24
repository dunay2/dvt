/** Owned concern: prove actual installed Vitest impact acquisition and conservative failure. */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readWebVitestImpactWitness } from '../../scripts/changed-suite-impact';
import { composeWebVitestImpactPlan } from '../../vitest/impact';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';

vi.mock('node:child_process', async (original) => {
  const actual = await original<typeof import('node:child_process')>();
  return { ...actual, spawnSync: vi.fn(actual.spawnSync) };
});
afterEach(() => vi.clearAllMocks());

const source = 'src/app/components/PlanExecutionDecisionView.tsx';
const webRoot = process.cwd();

describe('installed Web Vitest dependency evidence', () => {
  it.each([
    [source, 'src/app/components/PlanExecutionDecisionView.test.tsx'],
    [
      'src/app/plugins/createDeferredView.module.css',
      'src/app/plugins/createDeferredView.test.tsx',
    ],
  ])(
    'discovers actual source consumers without executing suites: %s',
    (changedSource, expectedTest) => {
      const witness = readWebVitestImpactWitness([changedSource], { webRoot });
      expect(witness).not.toBeNull();
      if (!witness) throw new Error('Expected actual Vitest graph evidence');
      const consumer = witness.sources[0]!;
      expect(consumer.path).toBe(changedSource);
      expect(consumer.tests).toContain(expectedTest);
      const related = consumer.tests;
      expect(related.length).toBeGreaterThan(0);
      expect(related.every((file) => witness.testFiles.includes(file))).toBe(true);
      const plan = composeWebVitestImpactPlan(
        resolveWebVitestChangedSuitePlan([changedSource]),
        [changedSource],
        witness
      );
      expect(plan.commands).toContain('pnpm run test:architecture:run');
      expect(plan.commandPlan.some((entry) => entry.kind === 'vitest-files')).toBe(true);
      expect(vi.mocked(spawnSync)).toHaveBeenCalledOnce();
      const result = vi.mocked(spawnSync).mock.results[0]!.value;
      expect(result.stdout).not.toContain('RUN  v');
      expect(result.stdout).not.toContain('Test Files');
    },
    60_000
  );

  it.each([
    ['src/app/components/__missing_3951__.tsx'],
    ['src/styles/theme.css'],
    ['vitest/runtimeConfig.ts'],
    [source, 'package.json'],
  ])('keeps conservative planning without acquiring inadmissible frontier %j', (...paths) => {
    expect(readWebVitestImpactWitness(paths, { webRoot })).toBeNull();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('does not acquire a graph for explicit complete execution', () => {
    expect(readWebVitestImpactWitness([source], { webRoot, full: true })).toBeNull();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it.each([
    { status: 1, stdout: '', stderr: 'graph unavailable' },
    { status: null, stdout: '', stderr: 'cancelled' },
    { status: 0, stdout: 'not JSON', stderr: '' },
    { status: 0, stdout: '{}', stderr: '' },
  ])('cannot turn worker failure or malformed output into reduced success: %j', (result) => {
    vi.mocked(spawnSync).mockReturnValueOnce({
      ...result,
      pid: 1,
      output: [],
      signal: null,
    });
    expect(readWebVitestImpactWitness([source], { webRoot })).toBeNull();
  });

  it('keeps graph inputs inside the existing governed implementation surface', () => {
    const pathOwner = readFileSync('vitest/paths.ts', 'utf8');
    expect(pathOwner).toContain('args|git|impact');
    expect(pathOwner).toContain('vitestSuites.impact.architecture.test.ts');
    expect(pathOwner).toContain('vitestSuites.impactAcquisition.architecture.test.ts');
  });
});
