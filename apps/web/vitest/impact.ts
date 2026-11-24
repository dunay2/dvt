/** Owned concern: compose transitive Vitest consumers through the existing suite owners. */
import type { WebVitestChangedSuiteName } from '../vitest.suites';
import { WEB_VITEST_PRIMARY_SUITE_NAMES } from '../vitest.suites';

import type { WebVitestChangedSuitePlan } from './changedPlan';
import { resolveChangedSuiteForWebPath } from './classification';
import { composeWebVitestCommandPlan } from './commands';
import { isCompleteWebVitestImpactWitness, type WebVitestImpactWitness } from './impactWitness';
import { isWebVitestTestPath, normalizeWebVitestChangedPath } from './paths';

function isWebSource(path: string): boolean {
  return (
    path.startsWith('src/') &&
    !path.split('/').includes('..') &&
    /\.(?:tsx?|module\.css)$/.test(path)
  );
}

function hasWebVitestProductSource(paths: readonly string[]): boolean {
  return paths
    .map(normalizeWebVitestChangedPath)
    .some((path) => path !== null && isWebSource(path) && !isWebVitestTestPath(path));
}

function composeConservativeWebVitestImpactPlan(
  baseline: WebVitestChangedSuitePlan,
  changed: readonly string[]
): WebVitestChangedSuitePlan {
  if (!hasWebVitestProductSource(changed)) return baseline;
  const suites = new Set([...baseline.suites, ...WEB_VITEST_PRIMARY_SUITE_NAMES]);
  return { ...baseline, ...composeWebVitestCommandPlan(suites, new Map()) };
}

export function isWebVitestImpactFrontier(paths: readonly string[], full = false): boolean {
  if (full || paths.length === 0) return false;
  const normalized = paths.map(normalizeWebVitestChangedPath);
  return (
    normalized.every((path) => path !== null && isWebSource(path)) &&
    normalized.some((path) => path !== null && !isWebVitestTestPath(path))
  );
}

function hasCompleteSourceConsumers(
  paths: readonly string[],
  witness: WebVitestImpactWitness
): boolean {
  const inventory = new Set(witness.testFiles);
  const sources = new Map(witness.sources.map((source) => [source.path, source.tests]));
  return paths
    .filter((path) => !isWebVitestTestPath(path))
    .every((path) => {
      const tests = sources.get(path);
      return (
        tests !== undefined &&
        tests.length > 0 &&
        tests.every((test) => inventory.has(test) && resolveChangedSuiteForWebPath(test) !== null)
      );
    });
}

function addImpactTest(exact: Map<WebVitestChangedSuiteName, Set<string>>, path: string): void {
  const suite = resolveChangedSuiteForWebPath(path);
  if (!suite) throw new Error('Unclassified Vitest impact consumer: ' + path);
  const files = exact.get(suite) ?? new Set<string>();
  files.add(path);
  exact.set(suite, files);
}

export function composeWebVitestImpactPlan(
  baseline: WebVitestChangedSuitePlan,
  changed: readonly string[],
  evidence: unknown
): WebVitestChangedSuitePlan {
  if (!isWebVitestImpactFrontier(changed) || !isCompleteWebVitestImpactWitness(evidence))
    return composeConservativeWebVitestImpactPlan(baseline, changed);
  const paths = changed.map((path) => normalizeWebVitestChangedPath(path)!);
  if (!hasCompleteSourceConsumers(paths, evidence))
    return composeConservativeWebVitestImpactPlan(baseline, changed);
  const exact = new Map<WebVitestChangedSuiteName, Set<string>>();
  const related = evidence.sources.flatMap((source) => source.tests);
  for (const test of [...related, ...paths.filter(isWebVitestTestPath)]) addImpactTest(exact, test);
  const plan = composeWebVitestCommandPlan(new Set(['architecture']), exact);
  return { ...baseline, ...plan };
}
