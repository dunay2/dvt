/** Owned concern: prove focus file coverage from the current catalog and execution settings. */
import { matchesGlob } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { WEB_VITEST_SUITES, type WebVitestChangedSuiteName } from '../vitest.suites';

import { createWebVitestConfig } from './runtimeConfig';

export type WebVitestCoverageSelection = Readonly<{
  suite: WebVitestChangedSuiteName;
  completeSuites: ReadonlySet<WebVitestChangedSuiteName>;
  inventory: readonly string[] | null;
}>;

export function haveEquivalentWebVitestSettings(
  left: WebVitestChangedSuiteName,
  right: WebVitestChangedSuiteName
): boolean {
  const settings = [left, right].map((suite) => {
    const config = createWebVitestConfig(suite);
    const test = { ...config.test };
    delete test.include;
    delete test.exclude;
    return { ...config, test };
  });
  return isDeepStrictEqual(settings[0], settings[1]);
}

export function matchesWebVitestSuite(suite: WebVitestChangedSuiteName, file: string): boolean {
  const { include, exclude } = WEB_VITEST_SUITES[suite];
  const matches = [include, exclude].map((patterns) =>
    patterns
      .filter((glob) => file.startsWith(/^[\w./-]*/.exec(glob)?.[0] ?? ''))
      .some((glob) => matchesGlob(file, glob))
  );
  return matches[0] === true && matches[1] === false;
}

function isUsableWebVitestCoverageInventory(
  inventory: readonly string[] | null
): inventory is readonly string[] {
  if (!inventory?.length) return false;
  if (new Set(inventory).size !== inventory.length) return false;
  return inventory.every((file) => /^src\/(?!.*(?:\\|\.\.\/)).*\.(?:test|spec)\.tsx?$/.test(file));
}

export function selectUncoveredWebVitestFiles(
  selection: WebVitestCoverageSelection
): readonly string[] | null {
  const { suite, completeSuites, inventory } = selection;
  if (suite === 'presentation') return null;
  if (!completeSuites.has('presentation')) return null;
  if (!isUsableWebVitestCoverageInventory(inventory)) return null;
  if (!haveEquivalentWebVitestSettings(suite, 'presentation')) return null;
  try {
    const focus = inventory.filter((file) => matchesWebVitestSuite(suite, file));
    const residual = focus.filter((file) => !matchesWebVitestSuite('presentation', file));
    return residual.length < focus.length ? residual.sort() : null;
  } catch {
    return null;
  }
}
