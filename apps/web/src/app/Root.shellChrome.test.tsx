// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withTestQueryClient } from '../testing/reactQueryHarness';
import {
  CANVAS_ROUTE_BOOTSTRAP_REGISTRATION,
  createRootShellNode,
} from './Root.bootstrapRoute.test.support';
import {
  resetRootShellStores,
  setRootShellBottomDrawer,
  setRootShellFocusMode,
  waitForShellBootstrapSurface,
} from './Root.test.support';
import {
  createHealthyPlatformCapability,
  expectRootShellWorkbenchFrameChrome,
  waitForHealthyShellChrome,
} from './Root.shellChrome.test.support';
import { resetRouteBootstrapPresentation } from './bootstrap/routeBootstrapRegistry';

describe('RootShell chrome', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRootShellStores();
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
  });

  afterEach(() => {
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
    vi.useRealTimers();
  });

  it('renders Canvas workbench chrome without the permanent left navigation rail', async () => {
    const mounted = await withTestQueryClient(
      createRootShellNode(createHealthyPlatformCapability(), ['/canvas'])
    );

    try {
      await waitForHealthyShellChrome(mounted);
      expectRootShellWorkbenchFrameChrome(mounted.container, 'Canvas route');
      expect(mounted.container.querySelector('[data-slot="left-navigation-rail"]')).toBeNull();
      await act(async () => {
        fireEvent.pointerDown(
          mounted.container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!
        );
      });

      await waitFor(() => {
        expect(
          [
            ...document.body.querySelectorAll<HTMLAnchorElement>(
              '[data-slot="shell-menu-navigation-link"]'
            ),
          ].map((link) => link.getAttribute('href'))
        ).toEqual(['/canvas', '/runs', '/templates', '/plugins', '/admin']);
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('renders Runs list chrome without the permanent left navigation rail', async () => {
    const mounted = await withTestQueryClient(
      createRootShellNode(createHealthyPlatformCapability(), ['/runs'])
    );

    try {
      await waitForHealthyShellChrome(mounted);
      expectRootShellWorkbenchFrameChrome(mounted.container, 'Runs route');
      expect(mounted.container.querySelector('[data-slot="left-navigation-rail"]')).toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it('renders run detail chrome without changing away from workbench navigation', async () => {
    const mounted = await withTestQueryClient(
      createRootShellNode(createHealthyPlatformCapability(), ['/runs/run_123'])
    );

    try {
      await waitForHealthyShellChrome(mounted);
      expect(mounted.container.textContent).toContain('Run detail route');
      expectRootShellWorkbenchFrameChrome(mounted.container, 'Run detail route');
      expect(mounted.container.querySelector('[data-slot="left-navigation-rail"]')).toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it('preserves focus-mode behavior by hiding the left rail while keeping the shell top bar', async () => {
    setRootShellFocusMode(true);
    const mounted = await withTestQueryClient(
      createRootShellNode(createHealthyPlatformCapability())
    );

    try {
      await waitForShellBootstrapSurface(mounted);

      expect(mounted.container.querySelector('[data-slot="left-navigation-rail"]')).toBeNull();
      expect(mounted.container.querySelector('[data-slot="app-shell-bottom-drawer"]')).toBeNull();
      expect(mounted.container.querySelector('[data-slot="shell-top-bar"]')).toBeTruthy();
    } finally {
      await mounted.cleanup();
    }
  });

  it('renders the bottom operational drawer inside the app shell frame when enabled', async () => {
    setRootShellBottomDrawer({ visible: true, height: 160 });
    const mounted = await withTestQueryClient(
      createRootShellNode(createHealthyPlatformCapability())
    );

    try {
      await waitForShellBootstrapSurface(mounted);

      const bottomDrawer = mounted.container.querySelector('[data-slot="app-shell-bottom-drawer"]');
      const appShellMain = mounted.container.querySelector('[data-slot="app-shell-main"]');
      const operationalDrawer = mounted.container.querySelector(
        '[data-slot="bottom-operational-drawer"]'
      );

      expect(bottomDrawer).not.toBeNull();
      expect(bottomDrawer?.closest('[data-slot="app-shell-main"]')).toBe(appShellMain);
      expect(operationalDrawer).not.toBeNull();
      expect(bottomDrawer?.textContent).toContain('Operations');
      expect(bottomDrawer?.textContent).toContain('Start a run to see live run events here.');
    } finally {
      await mounted.cleanup();
    }
  });
});
