/** Owned concern: verify root shell chrome posture through render-level test helpers. */
import type { QueryClient } from '@tanstack/react-query';
import { waitFor } from '@testing-library/dom';
import { expect, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import { createPlatformHealthSnapshot } from '../capabilities/platform-health/testing/platformHealthFixtures';
import { readLeftNavigationCaptions } from './appRoute.test.support';
import { queryKeys } from './queries/queryKeys';
import { waitForReactQuery } from '../testing/reactQueryHarness';
import { waitForShellBootstrapSurface } from './Root.test.support';
import navigationStyles from './components/LeftNavigation.module.css';
import topBarStyles from './components/shell/ShellChrome.module.css';

type RootShellMountedHarness = {
  container: ParentNode;
  queryClient: Pick<QueryClient, 'getQueryState'>;
};

const ROOT_SHELL_NAVIGATION_HREFS = [
  '/canvas',
  '/runs',
  '/templates',
  '/plugins',
  '/admin',
] as const;

function requireElement<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Expected root shell element for selector "${selector}".`);
  }
  return element;
}

type RootShellHeaderChromeMode = 'global' | 'workbench';

function expectRootShellHeaderChrome(container: ParentNode, mode: RootShellHeaderChromeMode): void {
  const shellTopBar = requireElement<HTMLElement>(container, '[data-slot="shell-top-bar"]');
  const shellConnectionStatus = requireElement<HTMLElement>(
    container,
    '[data-slot="shell-connection-status"]'
  );
  const shellMenuTrigger = requireElement<HTMLElement>(
    container,
    '[data-slot="shell-menu-trigger"]'
  );

  const brand = requireElement<HTMLElement>(shellTopBar, '[data-slot="shell-brand-identity"]');
  expect(brand.getAttribute('aria-label')).toBe('Raven');
  expect(brand.textContent).toBe('');
  expect(shellTopBar.textContent).toContain('View');
  expect(shellTopBar.className).toBe(topBarStyles.shellBar);
  expect(shellTopBar.querySelector('[data-slot="shell-workspace-selectors"]')).toBeNull();
  expect(shellTopBar.querySelector('[data-slot="shell-menu-trigger"]')).toBeTruthy();
  expect(shellTopBar.querySelector('[data-slot="shell-top-bar-canvas-controls"]')).toBeNull();
  expect(shellTopBar.querySelectorAll('[role="combobox"]')).toHaveLength(0);
  expect(shellConnectionStatus.className).toContain('text-[var(--text-default)]');

  expect(shellTopBar.querySelector('[data-slot="shell-git-ref"]')).toBeNull();
  expect(shellTopBar.querySelector('[data-slot="shell-project-identity-badge"]')).toBeNull();
  expect(shellTopBar.querySelector('[data-slot="shell-workspace-context-trigger"]')).toBeNull();
  expect(shellTopBar.querySelector('[data-slot="shell-workspace-menu-trigger"]')).toBeNull();
  expect(shellTopBar.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
  const project = container.querySelector(
    '[data-slot="left-navigation-rail"] [data-slot="shell-workspace-menu-trigger"]'
  );
  expect(project, `${mode} route retains project configuration in the rail`).not.toBeNull();
  expect(shellMenuTrigger.textContent).toContain('View');
}

export function createHealthyPlatformCapability(): PlatformHealthCapabilityApi {
  return {
    loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
  };
}

export async function waitForHealthyShellChrome(mounted: RootShellMountedHarness): Promise<void> {
  await waitForShellBootstrapSurface(mounted);
  await waitForReactQuery(
    () =>
      mounted.queryClient.getQueryState(queryKeys.shell.platformHealthSnapshot())?.status ===
      'success',
    {
      description: 'healthy platform health query for shell chrome',
    }
  );
  await waitFor(() => {
    expect(
      requireElement<HTMLElement>(mounted.container, '[data-slot="shell-connection-status"]')
        .className
    ).not.toContain('text-[var(--text-subtle)]');
  });
}

export function expectRootShellFrameChrome(
  container: ParentNode,
  expectedOutletText: string
): void {
  const appShellBody = requireElement<HTMLElement>(container, '[data-slot="app-shell-body"]');
  const appShellFrame = requireElement<HTMLElement>(container, '[data-slot="app-shell-frame"]');
  const appShellLeftNavigation = requireElement<HTMLElement>(
    container,
    '[data-slot="app-shell-left-navigation"]'
  );
  const appShellMain = requireElement<HTMLElement>(container, '[data-slot="app-shell-main"]');
  const appShellOutlet = requireElement<HTMLElement>(container, '[data-slot="app-shell-outlet"]');

  expect(appShellFrame).toBeTruthy();
  expect(appShellLeftNavigation.parentElement).toBe(appShellBody);
  expect(appShellMain.parentElement).toBe(appShellBody);
  expect(appShellOutlet.closest('[data-slot="app-shell-main"]')).toBe(appShellMain);
  expect(appShellOutlet.textContent).toContain(expectedOutletText);
  expectRootShellHeaderChrome(container, 'global');
}

export function expectRootShellWorkbenchFrameChrome(
  container: ParentNode,
  expectedOutletText: string
): void {
  const appShellFrame = requireElement<HTMLElement>(container, '[data-slot="app-shell-frame"]');
  const appShellMain = requireElement<HTMLElement>(container, '[data-slot="app-shell-main"]');
  const appShellOutlet = requireElement<HTMLElement>(container, '[data-slot="app-shell-outlet"]');

  expect(appShellFrame).toBeTruthy();
  expect(container.querySelector('[data-slot="app-shell-left-navigation"]')).not.toBeNull();
  expect(appShellOutlet.closest('[data-slot="app-shell-main"]')).toBe(appShellMain);
  expect(appShellOutlet.textContent).toContain(expectedOutletText);
  expectRootShellHeaderChrome(container, 'workbench');
}

export function expectRootShellNavigationChrome(container: ParentNode, activeHref: string): void {
  const leftNavigationRail = requireElement<HTMLElement>(
    container,
    '[data-slot="left-navigation-rail"]'
  );
  const leftNavigationLinks = [
    ...container.querySelectorAll<HTMLElement>(
      '[data-slot="left-navigation-link"], [data-slot="left-navigation-section-trigger"]'
    ),
  ];
  const activeNavigationLink = leftNavigationLinks.find(
    (link) => readShellNavigationDestination(link) === activeHref
  );
  if (!activeNavigationLink) {
    throw new Error(`Expected left navigation link for "${activeHref}".`);
  }

  expect(leftNavigationRail.className).toBe(navigationStyles.rail);
  expect(leftNavigationLinks.map(readShellNavigationDestination)).toEqual(
    ROOT_SHELL_NAVIGATION_HREFS
  );
  expect(readLeftNavigationCaptions(container)).toContain('Runs');
  expect(readLeftNavigationCaptions(container)).toContain('Canvas');
  expect(activeNavigationLink.classList).toContain(navigationStyles.link);
  expectActiveRootShellNavigationLink(container, activeHref);
}

export function expectActiveRootShellNavigationLink(
  container: ParentNode,
  activeHref: string
): void {
  const activeNavigationLink = [
    ...container.querySelectorAll<HTMLElement>(
      '[data-slot="left-navigation-link"], [data-slot="left-navigation-section-trigger"]'
    ),
  ].find((link) => readShellNavigationDestination(link) === activeHref);
  if (!activeNavigationLink) {
    throw new Error(`Expected left navigation link for "${activeHref}".`);
  }

  expect(activeNavigationLink.getAttribute('aria-current')).toBe('page');
  expect(activeNavigationLink.className).not.toContain('isActive');
}

function readShellNavigationDestination(entry: HTMLElement): string | null {
  return entry.getAttribute('href') ?? entry.getAttribute('data-route');
}
