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
