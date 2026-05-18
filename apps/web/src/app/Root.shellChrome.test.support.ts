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

type RootShellMountedHarness = {
  container: ParentNode;
  queryClient: Pick<QueryClient, 'getQueryState'>;
};

const ROOT_SHELL_NAVIGATION_HREFS = ['/canvas', '/runs', '/plugins', '/admin'] as const;

function requireElement<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Expected root shell element for selector "${selector}".`);
  }
  return element;
}

function expectRootShellHeaderChrome(container: ParentNode): void {
  const shellTopBar = requireElement<HTMLElement>(container, '[data-slot="shell-top-bar"]');
  const shellGitRef = requireElement<HTMLElement>(container, '[data-slot="shell-git-ref"]');
  const shellConnectionStatus = requireElement<HTMLElement>(
    container,
    '[data-slot="shell-connection-status"]'
  );
  const shellProjectIdentityBadge = requireElement<HTMLElement>(
    container,
    '[data-slot="shell-project-identity-badge"]'
  );
  const shellWorkspaceContextTrigger = requireElement<HTMLElement>(
    container,
    '[data-slot="shell-workspace-context-trigger"]'
  );
  const shellMenuTrigger = requireElement<HTMLElement>(
    container,
    '[data-slot="shell-menu-trigger"]'
  );

  expect(shellTopBar.textContent).toContain('Raven');
  expect(shellTopBar.textContent).toContain('View');
  expect(shellTopBar.className).toContain('bg-[var(--surface-shell)]');
  expect(shellTopBar.querySelector('[data-slot="shell-git-ref"]')).toBeTruthy();
  expect(shellTopBar.querySelector('[data-slot="shell-project-identity-badge"]')).toBeTruthy();
  expect(shellTopBar.querySelector('[data-slot="shell-workspace-context-trigger"]')).toBeTruthy();
  expect(shellTopBar.querySelector('[data-slot="shell-workspace-selectors"]')).toBeNull();
  expect(shellTopBar.querySelector('[data-slot="shell-menu-trigger"]')).toBeTruthy();
  expect(shellTopBar.querySelectorAll('[role="combobox"]')).toHaveLength(0);
  expect(shellConnectionStatus.className).toContain('text-[var(--text-default)]');
  expect(shellGitRef.className).toContain('text-[var(--text-subtle)]');
  expect(
    shellProjectIdentityBadge.querySelector('[data-slot="shell-project-identity-title"]')
  ).not.toBeNull();
  expect(
    shellProjectIdentityBadge.querySelector('[data-slot="shell-project-identity-env"]')
  ).not.toBeNull();
  expect(shellProjectIdentityBadge.className).toContain('bg-[var(--surface-app)]');
  expect(shellWorkspaceContextTrigger.textContent).toContain('Context');
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
  expectRootShellHeaderChrome(container);
}

export function expectRootShellWorkbenchFrameChrome(
  container: ParentNode,
  expectedOutletText: string
): void {
  const appShellFrame = requireElement<HTMLElement>(container, '[data-slot="app-shell-frame"]');
  const appShellMain = requireElement<HTMLElement>(container, '[data-slot="app-shell-main"]');
  const appShellOutlet = requireElement<HTMLElement>(container, '[data-slot="app-shell-outlet"]');

  expect(appShellFrame).toBeTruthy();
  expect(container.querySelector('[data-slot="app-shell-left-navigation"]')).toBeNull();
  expect(appShellOutlet.closest('[data-slot="app-shell-main"]')).toBe(appShellMain);
  expect(appShellOutlet.textContent).toContain(expectedOutletText);
  expectRootShellHeaderChrome(container);
}

export function expectRootShellNavigationChrome(container: ParentNode, activeHref: string): void {
  const leftNavigationRail = requireElement<HTMLElement>(
    container,
    '[data-slot="left-navigation-rail"]'
  );
  const leftNavigationLinks = [
    ...container.querySelectorAll<HTMLAnchorElement>('[data-slot="left-navigation-link"]'),
  ];
  const activeNavigationLink = leftNavigationLinks.find(
    (link) => link.getAttribute('href') === activeHref
  );
  if (!activeNavigationLink) {
    throw new Error(`Expected left navigation link for "${activeHref}".`);
  }

  expect(leftNavigationRail.className).toContain('bg-[var(--surface-shell)]');
  expect(leftNavigationRail.className).toContain('h-full');
  expect(leftNavigationLinks.map((link) => link.getAttribute('href'))).toEqual(
    ROOT_SHELL_NAVIGATION_HREFS
  );
  expect(readLeftNavigationCaptions(container)).toContain('Runs');
  expect(readLeftNavigationCaptions(container)).toContain('Canvas');
  expect(activeNavigationLink.className).toContain('grid-cols-[18px_1fr]');
  expectActiveRootShellNavigationLink(container, activeHref);
}

export function expectActiveRootShellNavigationLink(
  container: ParentNode,
  activeHref: string
): void {
  const activeNavigationLink = [
    ...container.querySelectorAll<HTMLAnchorElement>('[data-slot="left-navigation-link"]'),
  ].find((link) => link.getAttribute('href') === activeHref);
  if (!activeNavigationLink) {
    throw new Error(`Expected left navigation link for "${activeHref}".`);
  }

  expect(activeNavigationLink.className).toContain('border-[color:var(--status-running)]');
  expect(activeNavigationLink.className).not.toContain('isActive');
}
