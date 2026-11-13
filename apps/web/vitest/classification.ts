/**
 * Owned concern: classify Web source and test paths into primary and focus ownership.
 * @baseline GH-3765: one module mixed catalog, runtime and plan policies.
 * @decision Keep one owner per reason to change and reuse the existing rails.
 * @consequence Consumers import the real owner without compatibility re-exports.
 */
import type {
  WebVitestPrimarySuiteName,
  WebVitestFocusSuiteName,
  WebVitestChangedSuiteName,
} from '../vitest.suites';
import { WEB_VITEST_TEST_SOURCE_OWNERS } from '../vitest.suites';

import {
  normalizeWebVitestPath,
  isArchitectureTestPath,
  isCanvasFocusPath,
  isMonacoFocusPath,
  isShellSessionFocusPath,
  isWorkspaceServicesFocusPath,
  resolveCanvasChangedSuite,
} from './paths';

export function classifyWebVitestFile(filePath: string): {
  primarySuites: WebVitestPrimarySuiteName[];
  focusSuites: WebVitestFocusSuiteName[];
} | null {
  const normalizedPath = normalizeWebVitestPath(filePath);
  if (!/\.(?:test|spec)\.(?:ts|tsx)$/.test(normalizedPath)) {
    return null;
  }

  const primarySuites: WebVitestPrimarySuiteName[] = [];
  if (isArchitectureTestPath(normalizedPath)) {
    primarySuites.push('architecture');
  } else if (/\.(?:test|spec)\.tsx$/.test(normalizedPath)) {
    primarySuites.push('presentation');
  } else if (/\.(?:test|spec)\.ts$/.test(normalizedPath)) {
    primarySuites.push('unit');
  }

  const focusSuites: WebVitestFocusSuiteName[] = [];
  if (isCanvasFocusPath(normalizedPath)) {
    focusSuites.push('canvas');
    const canvasChangedSuite = resolveCanvasChangedSuite(normalizedPath);
    focusSuites.push(canvasChangedSuite);
  }

  if (isMonacoFocusPath(normalizedPath)) {
    focusSuites.push('monaco');
  }

  if (isShellSessionFocusPath(normalizedPath)) {
    focusSuites.push('shell-session');
  }

  if (isWorkspaceServicesFocusPath(normalizedPath)) {
    focusSuites.push('workspace-services');
  }

  return {
    primarySuites,
    focusSuites,
  };
}

function tryAddFocusSuite(
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>
): boolean {
  if (isCanvasFocusPath(webPath)) {
    selectedSuites.add(resolveCanvasChangedSuite(webPath));
    return true;
  }

  if (isMonacoFocusPath(webPath)) {
    selectedSuites.add('monaco');
    return true;
  }

  if (isShellSessionFocusPath(webPath)) {
    selectedSuites.add('shell-session');
    return true;
  }

  if (isWorkspaceServicesFocusPath(webPath)) {
    selectedSuites.add('workspace-services');
    return true;
  }

  return false;
}

function tryAddClassifiedSuite(
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>
): boolean {
  const classification = classifyWebVitestFile(webPath);
  const primarySuite = classification?.primarySuites[0];
  if (primarySuite) {
    selectedSuites.add(primarySuite);
    return true;
  }

  if (webPath.endsWith('.tsx')) {
    selectedSuites.add('presentation');
    return true;
  }

  if (webPath.endsWith('.ts')) {
    selectedSuites.add('unit');
    return true;
  }

  return false;
}

export function resolveSuiteForWebPath(
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>
): void {
  if (!tryAddFocusSuite(webPath, selectedSuites)) {
    tryAddClassifiedSuite(webPath, selectedSuites);
  }
}

export function resolveChangedSuiteForWebPath(webPath: string): WebVitestChangedSuiteName | null {
  const selectedSuites = new Set<WebVitestChangedSuiteName>();
  resolveSuiteForWebPath(webPath, selectedSuites);

  return selectedSuites.values().next().value ?? null;
}

/** Query declared ownership only; physical closure remains a mandatory evidence obligation. */
export function resolveWebVitestTestSourceOwners(
  filePath: string,
  catalog: unknown = WEB_VITEST_TEST_SOURCE_OWNERS
): readonly string[] | null {
  if (!Array.isArray(catalog) || catalog.length === 0)
    throw new Error('Invalid test-source ownership catalog');
  const helpers = new Map<string, readonly string[]>();
  const entries = new Set<string>();
  function paths(value: unknown, owner: boolean): string[] {
    if (!Array.isArray(value) || value.length === 0) throw new Error('Empty test-source ownership');
    const result: string[] = [];
    for (const candidate of value) {
      if (
        typeof candidate !== 'string' ||
        candidate !== normalizeWebVitestPath(candidate) ||
        !candidate.startsWith('src/') ||
        candidate.includes('\0') ||
        candidate.split('/').some((part) => !part || part === '.' || part === '..') ||
        /[\\:*?[\]{}#\s]/u.test(candidate) ||
        (owner
          ? !isArchitectureTestPath(candidate)
          : !/\.tsx?$/.test(candidate) || /\.(?:test|spec)\.tsx?$/.test(candidate))
      ) {
        throw new Error('Invalid test-source ownership path');
      }
      if (result.includes(candidate)) throw new Error('Duplicate test-source ownership path');
      result.push(candidate);
    }
    return result;
  }
  for (const item of catalog) {
    if (item === null || typeof item !== 'object' || !('entries' in item) || !('helpers' in item)) {
      throw new Error('Invalid test-source ownership cohort');
    }
    const owners = paths(item.entries, true);
    owners.forEach((owner) => entries.add(owner));
    for (const helper of paths(item.helpers, false)) {
      if (helpers.has(helper)) throw new Error('Ambiguous test-source ownership');
      helpers.set(helper, owners);
    }
  }
  if ([...entries].some((entry) => helpers.has(entry)))
    throw new Error('Test-source owner overlaps helper');
  const normalized = normalizeWebVitestPath(filePath).replace(/^apps\/web\//, '');
  return entries.has(normalized) ? [normalized] : (helpers.get(normalized) ?? null);
}
