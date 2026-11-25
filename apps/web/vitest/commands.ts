/**
 * Owned concern: compose ordered Vitest commands with exact batching and complete-coverage absorption.
 * @baseline GH-3765: one module mixed catalog, runtime and plan policies.
 * @decision Keep one owner per reason to change and reuse the existing rails.
 * @consequence Consumers import the real owner without compatibility re-exports.
 */
import {
  WEB_VITEST_PRIMARY_SUITE_NAMES,
  WEB_VITEST_FOCUS_SUITE_NAMES,
  type WebVitestChangedSuiteName,
} from '../vitest.suites';

import { haveEquivalentWebVitestSettings, selectUncoveredWebVitestFiles } from './coverage';

export type WebVitestChangedCommandPlanEntry =
  | Readonly<{ kind: 'shell'; command: string }>
  | Readonly<{ kind: 'vitest-files'; config: string; filePaths: readonly string[] }>;

export type WebVitestCommandPlan = {
  suites: WebVitestChangedSuiteName[];
  commands: string[];
  commandPlan: WebVitestChangedCommandPlanEntry[];
  requiresDependencies: boolean;
};

export const WEB_VITEST_CHANGED_SUITE_ORDER: readonly WebVitestChangedSuiteName[] = [
  'canvas-unit',
  'canvas-presentation',
  'canvas-architecture',
  'monaco',
  'shell-session',
  'workspace-services',
  'unit',
  'presentation',
  'architecture',
] as const;

const routedSuiteNames: readonly WebVitestChangedSuiteName[] = [
  ...WEB_VITEST_PRIMARY_SUITE_NAMES,
  ...WEB_VITEST_FOCUS_SUITE_NAMES.filter((name) => name !== 'canvas'),
];

export const WEB_VITEST_CHANGED_SUITE_COMMANDS = Object.fromEntries(
  routedSuiteNames.map((name) => [name, `pnpm run test:${name}:run`])
) as Record<WebVitestChangedSuiteName, string>;

function createExactChangedTestCommandPlanEntry(
  suiteName: WebVitestChangedSuiteName,
  webPaths: readonly string[]
): WebVitestChangedCommandPlanEntry {
  return {
    kind: 'vitest-files',
    config: `vitest.${suiteName}.config.ts`,
    filePaths: [...webPaths],
  };
}

function quoteShellArg(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function composeWebVitestCommandPlan(
  completeSuites: ReadonlySet<WebVitestChangedSuiteName>,
  exactTests: ReadonlyMap<WebVitestChangedSuiteName, ReadonlySet<string>>,
  inventory: readonly string[] | null = null
): WebVitestCommandPlan {
  const selectedSuites = new Set(completeSuites);
  const exactTestPaths = new Map(exactTests);
  for (const primary of WEB_VITEST_PRIMARY_SUITE_NAMES) {
    if (!selectedSuites.has(primary)) continue;
    const coveredCanvasSuite = `canvas-${primary}` as const;
    selectedSuites.delete(coveredCanvasSuite);
    exactTestPaths.delete(coveredCanvasSuite);
  }
  absorbEquivalentWebVitestCoverage({ selectedSuites, exactTestPaths, inventory });

  const suites = WEB_VITEST_CHANGED_SUITE_ORDER.filter(
    (suiteName) => selectedSuites.has(suiteName) || exactTestPaths.has(suiteName)
  );
  const commandPlan = suites.flatMap((suiteName): WebVitestChangedCommandPlanEntry[] => {
    const exactPaths = [...(exactTestPaths.get(suiteName) ?? [])].sort((left, right) =>
      left.localeCompare(right)
    );

    if (selectedSuites.has(suiteName)) {
      return [{ kind: 'shell', command: WEB_VITEST_CHANGED_SUITE_COMMANDS[suiteName] }];
    }

    return exactPaths.length === 0
      ? []
      : [createExactChangedTestCommandPlanEntry(suiteName, exactPaths)];
  });

  return {
    suites,
    commands: commandPlan.map((entry) =>
      entry.kind === 'shell'
        ? entry.command
        : `pnpm exec vitest run --config ${entry.config} ${entry.filePaths
            .map((filePath) => quoteShellArg(filePath))
            .join(' ')}`
    ),
    commandPlan,
    requiresDependencies: commandPlan.some((entry) => entry.kind === 'shell'),
  };
}

function absorbEquivalentWebVitestCoverage(input: {
  selectedSuites: Set<WebVitestChangedSuiteName>;
  exactTestPaths: Map<WebVitestChangedSuiteName, ReadonlySet<string>>;
  inventory: readonly string[] | null;
}): void {
  const { selectedSuites, exactTestPaths, inventory } = input;
  for (const suite of selectedSuites) {
    const residual = selectUncoveredWebVitestFiles({
      suite,
      completeSuites: selectedSuites,
      inventory,
    });
    if (residual === null) continue;
    selectedSuites.delete(suite);
    exactTestPaths.delete(suite);
    if (residual.length > 0) exactTestPaths.set(suite, new Set(residual));
  }
}

export function hasCompleteWebVitestPresentationOverlap(plan: WebVitestCommandPlan): boolean {
  const complete = new Set(
    plan.commandPlan.filter((entry) => entry.kind === 'shell').map((entry) => entry.command)
  );
  return (
    complete.has(WEB_VITEST_CHANGED_SUITE_COMMANDS.presentation) &&
    routedSuiteNames.some(
      (suite) =>
        suite !== 'presentation' &&
        complete.has(WEB_VITEST_CHANGED_SUITE_COMMANDS[suite]) &&
        haveEquivalentWebVitestSettings(suite, 'presentation')
    )
  );
}

export function absorbWebVitestCommandPlan(
  plan: WebVitestCommandPlan,
  inventory: readonly string[] | null
): WebVitestCommandPlan {
  if (!inventory) return plan;
  const complete = new Set<WebVitestChangedSuiteName>();
  const exact = new Map<WebVitestChangedSuiteName, ReadonlySet<string>>();
  for (const entry of plan.commandPlan) {
    const suite = routedSuiteNames.find((name) =>
      entry.kind === 'shell'
        ? entry.command === WEB_VITEST_CHANGED_SUITE_COMMANDS[name]
        : entry.config === `vitest.${name}.config.ts`
    );
    if (!suite) return plan;
    if (entry.kind === 'shell') complete.add(suite);
    else exact.set(suite, new Set(entry.filePaths));
  }
  return composeWebVitestCommandPlan(complete, exact, inventory);
}
