import { isCompleteWebVitestImpactWitness } from '../../vitest/impactWitness';
/** Owned concern: retain transitive behavior and filesystem proof in one changed plan. */
import { describe, expect, it } from 'vitest';

import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { composeWebVitestImpactPlan, isWebVitestImpactFrontier } from '../../vitest/impact';
import { describeWebVitestExecutionPartitions } from '../../scripts/vitest-execution-partitions';

const source = 'src/app/queries/queryKeys.ts';
const unit = 'src/app/queries/dbtSelectedModelAnalysisCache.test.ts';
const presentation = 'src/app/queries/workspaceQueries.scope.test.tsx';
const other = 'src/app/views/code/useCodeWorkspaceFileContext.queryLifetime.test.tsx';
const architecture = 'src/app/views/canvas/canvasDraftQueryCache.architecture.test.ts';
const witness = {
  testFiles: [unit, presentation, other, architecture],
  sources: [{ path: source, tests: [unit, presentation, other] }],
};

describe('Web dependency impact admission', () => {
  it.each([
    ['unit', ['unit']],
    ['canvas-unit', ['unit']],
    ['architecture', ['architecture']],
    ['canvas-architecture', ['architecture']],
    ['presentation', ['presentation-1', 'presentation-2', 'presentation-3']],
    ['canvas-presentation', ['presentation-1', 'presentation-2', 'presentation-3']],
    ['monaco', ['changed']],
    ['shell-session', ['changed']],
    ['workspace-services', ['changed']],
  ] as const)('retains every exact %s file once across hosted groups', (suite, groups) => {
    const files = Array.from({ length: 7 }, (_, index) => `src/example-${index}.test.tsx`);
    const commands = [
      { kind: 'vitest-files', config: `vitest.${suite}.config.ts`, filePaths: files },
    ] as const;
    const before = structuredClone(commands);
    const partitions = describeWebVitestExecutionPartitions(commands);
    expect(partitions.map((partition) => partition.group)).toEqual(groups);
    const union = partitions.flatMap((partition) =>
      partition.commands.flatMap((entry) => (entry.kind === 'vitest-files' ? entry.filePaths : []))
    );
    expect(union.slice().sort()).toEqual(files);
    expect(new Set(union).size).toBe(files.length);
    expect(commands).toEqual(before);
  });

  it('retains cross-lane consumers and the complete filesystem architecture obligation', () => {
    const baseline = resolveWebVitestChangedSuitePlan([source]);
    const plan = composeWebVitestImpactPlan(baseline, [source], witness);
    expect(plan.commandPlan).toEqual([
      { kind: 'vitest-files', config: 'vitest.monaco.config.ts', filePaths: [other] },
      { kind: 'vitest-files', config: 'vitest.unit.config.ts', filePaths: [unit] },
      { kind: 'vitest-files', config: 'vitest.presentation.config.ts', filePaths: [presentation] },
      { kind: 'shell', command: 'pnpm run test:architecture:run' },
    ]);
    expect(plan.browserCommands).toEqual(baseline.browserCommands);
    expect(plan.browserFiles).toEqual(baseline.browserFiles);
    expect(
      describeWebVitestExecutionPartitions(plan.commandPlan).flatMap((p) => p.commands)
    ).toEqual([plan.commandPlan[1], plan.commandPlan[3], plan.commandPlan[2], plan.commandPlan[0]]);
  });

  it('preserves changed tests, stable ordering and input data', () => {
    const changed = [source, unit];
    const before = structuredClone(witness);
    const baseline = resolveWebVitestChangedSuitePlan(changed);
    const partial = { ...witness, sources: [{ path: source, tests: [presentation] }] };
    const result = composeWebVitestImpactPlan(baseline, changed, partial);
    expect(result.commands.join(' ')).toContain(unit);
    expect(composeWebVitestImpactPlan(baseline, [...changed].reverse(), partial)).toEqual(result);
    expect(witness).toEqual(before);
    expect(new Set(result.commands).size).toBe(result.commands.length);
  });

  it.each([
    null,
    { ...witness, sources: [] },
    { ...witness, sources: [{ path: source, tests: [] }] },
    { ...witness, sources: [{ path: source, tests: ['src/unknown.test.ts'] }] },
  ])('retains conservative obligations without a complete consumer witness: %j', (evidence) => {
    const plan = resolveWebVitestChangedSuitePlan([source]);
    const conservative = composeWebVitestImpactPlan(plan, [source], evidence);
    expect(conservative.commands).toEqual([
      'pnpm run test:unit:run',
      'pnpm run test:presentation:run',
      'pnpm run test:architecture:run',
    ]);
    expect(
      describeWebVitestExecutionPartitions(conservative.commandPlan).map((p) => p.group)
    ).toEqual(['unit', 'architecture', 'presentation-1', 'presentation-2', 'presentation-3']);
  });

  it('retains all primary groups for missing or mixed source companions without inventing a whitelist', () => {
    const changed = [source, 'docs/evidence/proof.md'];
    const baseline = resolveWebVitestChangedSuitePlan(changed);
    expect(composeWebVitestImpactPlan(baseline, changed, null).suites).toEqual([
      'unit',
      'presentation',
      'architecture',
    ]);
    const testOnly = resolveWebVitestChangedSuitePlan([unit]);
    expect(composeWebVitestImpactPlan(testOnly, [unit], null)).toBe(testOnly);
  });

  it.each([
    ['src/styles/theme.css'],
    ['vitest/runtimeConfig.ts'],
    ['src/app/queries/newFile.json'],
    [source, 'package.json'],
    [source, 'scripts/native-runner.mjs'],
    [source, '../outside.ts'],
  ])('rejects an unclassified or infrastructure frontier %j', (...changed) => {
    expect(isWebVitestImpactFrontier(changed)).toBe(false);
  });

  it('recognizes normalized source paths and refuses test-only or explicit full projections', () => {
    expect(isWebVitestImpactFrontier([source])).toBe(true);
    expect(isWebVitestImpactFrontier(['src/app/plugins/createDeferredView.module.css'])).toBe(true);
    expect(isWebVitestImpactFrontier([source, unit])).toBe(true);
    expect(isWebVitestImpactFrontier([unit])).toBe(false);
    expect(isWebVitestImpactFrontier([source], true)).toBe(false);
  });

  it.each([null, [], {}, { testFiles: [1], sources: [] }, { testFiles: [], sources: [null] }])(
    'rejects malformed graph output %j',
    (value) => {
      expect(isCompleteWebVitestImpactWitness(value)).toBe(false);
    }
  );
});
