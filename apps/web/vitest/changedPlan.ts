/**
 * Owned concern: query complete changed Web obligations using the existing Vitest and Cypress owners.
 * @baseline GH-3765: one module mixed catalog, runtime and plan policies.
 * @decision Keep one owner per reason to change and reuse the existing rails.
 * @consequence Consumers import the real owner without compatibility re-exports.
 */
import type { WebCypressCatalogSnapshots } from '../cypress.catalog';
import { resolveWebCypressChangedPlan, type WebCypressCommand } from '../cypress.changed';
import type { WebVitestChangedSuiteName } from '../vitest.suites';

import { resolveSuiteForWebPath, resolveChangedSuiteForWebPath } from './classification';
import { composeWebVitestCommandPlan, type WebVitestCommandPlan } from './commands';
import {
  normalizeWebVitestChangedPath,
  isWebVitestTestPath,
  isWebVitestGovernancePath,
  WEB_VITEST_GOVERNANCE_TEST_PATHS,
} from './paths';

export type WebVitestChangedSuitePlan = WebVitestCommandPlan & {
  browserCommands: WebCypressCommand[];
  browserFiles: string[];
  retiredBrowserFiles: string[];
  catalogAdditions?: ReturnType<typeof resolveWebCypressChangedPlan>['catalogAdditions'];
};

export function resolveWebVitestChangedSuitePlan(
  filePaths: readonly string[],
  options: Readonly<{ full?: boolean; catalogSnapshots?: WebCypressCatalogSnapshots }> = {}
): WebVitestChangedSuitePlan {
  const browser = resolveWebCypressChangedPlan(filePaths, options.full, options.catalogSnapshots);
  const selectedSuites = new Set<WebVitestChangedSuiteName>();
  const exactTestPaths = new Map<WebVitestChangedSuiteName, Set<string>>();
  const changedWebPaths = new Set(
    browser.vitestFiles
      .map((filePath) => normalizeWebVitestChangedPath(filePath))
      .filter((webPath): webPath is string => webPath !== null)
  );

  function addExactTestPath(suiteName: WebVitestChangedSuiteName, webPath: string): void {
    const paths = exactTestPaths.get(suiteName) ?? new Set<string>();
    paths.add(webPath);
    exactTestPaths.set(suiteName, paths);
  }

  function findDirectChangedTestPath(webPath: string): string | null {
    if (!webPath.startsWith('src/') || isWebVitestTestPath(webPath)) {
      return null;
    }

    const match = /^(.*)\.(ts|tsx)$/.exec(webPath);
    if (!match) {
      return null;
    }

    const [, stem, extension] = match;
    const alternateExtension = extension === 'ts' ? 'tsx' : 'ts';
    const candidates = [
      `${stem}.test.${extension}`,
      `${stem}.spec.${extension}`,
      `${stem}.test.${alternateExtension}`,
      `${stem}.spec.${alternateExtension}`,
    ];

    return candidates.find((candidate) => changedWebPaths.has(candidate)) ?? null;
  }

  for (const filePath of browser.vitestFiles) {
    const webPath = normalizeWebVitestChangedPath(filePath);
    if (
      webPath &&
      /^src\/testing\/vitestSuites\.browserRouting\.[^/]+\.ts$/.test(webPath) &&
      !isWebVitestTestPath(webPath)
    ) {
      addExactTestPath(
        'architecture',
        'src/testing/vitestSuites.browserRouting.architecture.test.ts'
      );
      continue;
    }
    if (isWebVitestGovernancePath(filePath) || (webPath && isWebVitestGovernancePath(webPath))) {
      for (const guardPath of WEB_VITEST_GOVERNANCE_TEST_PATHS) {
        addExactTestPath('architecture', guardPath);
      }
      continue;
    }

    if (!webPath) continue;

    if (isWebVitestTestPath(webPath)) {
      const suiteName = resolveChangedSuiteForWebPath(webPath);
      if (suiteName) {
        addExactTestPath(suiteName, webPath);
      }
      continue;
    }

    // Filesystem-reading guards cross focus-lane boundaries, even for paired source edits.
    if (webPath.startsWith('src/') && /\.tsx?$/.test(webPath)) selectedSuites.add('architecture');

    const directChangedTestPath = findDirectChangedTestPath(webPath);
    if (directChangedTestPath) {
      const suiteName = resolveChangedSuiteForWebPath(directChangedTestPath);
      if (suiteName) {
        addExactTestPath(suiteName, directChangedTestPath);
        continue;
      }
    }

    resolveSuiteForWebPath(webPath, selectedSuites);
  }

  const plan = composeWebVitestCommandPlan(selectedSuites, exactTestPaths);
  return {
    suites: plan.suites,
    browserCommands: browser.commands,
    browserFiles: browser.requiredFiles,
    retiredBrowserFiles: browser.retiredFiles,
    ...(browser.catalogAdditions === undefined
      ? {}
      : { catalogAdditions: browser.catalogAdditions }),
    commands: plan.commands,
    commandPlan: plan.commandPlan,
    requiresDependencies: plan.requiresDependencies,
  };
}
