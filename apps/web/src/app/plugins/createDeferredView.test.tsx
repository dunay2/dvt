// @vitest-environment jsdom
import React, { act, StrictMode, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { createDeferredView } from './createDeferredView';
import { PluginContributionBoundary } from './PluginContributionBoundary';

type RouteModule = Readonly<{ default: React.ComponentType }>;

function createPendingModule(): Readonly<{
  promise: Promise<RouteModule>;
  resolve: (module: RouteModule) => void;
  reject: (error: unknown) => void;
}> {
  let resolve!: (module: RouteModule) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<RouteModule>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('createDeferredView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useApplicationLanguageStore.setState({ language: 'en' });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders the route view after its deferred module resolves', async () => {
    const pendingModule = createPendingModule();
    const load = vi.fn(() => pendingModule.promise);
    const DeferredView = createDeferredView(load);

    await act(async () => {
      root.render(<DeferredView />);
    });

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).not.toBeNull();
    expect(container.textContent).toContain('Loading view…');

    await act(async () => {
      pendingModule.resolve({ default: () => <main>Loaded route</main> });
      await pendingModule.promise;
    });

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).toBeNull();
    expect(container.textContent).toContain('Loaded route');

    act(() => root.render(null));
    act(() => root.render(<DeferredView />));

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).toBeNull();
    expect(container.textContent).toContain('Loaded route');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('settles a shared import before a suspended route can commit', async () => {
    const pendingModule = createPendingModule();
    const load = vi.fn(() => pendingModule.promise);
    const DeferredView = createDeferredView(load);
    let canCommit = false;
    let allowCommit!: () => void;
    const pendingCommit = new Promise<void>((resolve) => {
      allowCommit = resolve;
    });
    function AwaitRouteCommit(): null {
      if (!canCommit) throw pendingCommit;
      return null;
    }

    await act(async () => {
      root.render(
        <Suspense fallback={<p>Waiting for route context</p>}>
          <DeferredView />
          <AwaitRouteCommit />
        </Suspense>
      );
    });

    expect(container.textContent).toBe('Waiting for route context');
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingModule.resolve({ default: () => <main>Loaded before commit</main> });
      await pendingModule.promise;
    });

    expect(container.textContent).toBe('Waiting for route context');

    await act(async () => {
      canCommit = true;
      allowCommit();
      await pendingCommit;
    });

    expect(container.textContent).toBe('Loaded before commit');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('notifies the replacement StrictMode consumer when the original consumer leaves', async () => {
    const pendingModule = createPendingModule();
    const load = vi.fn(() => pendingModule.promise);
    const DeferredView = createDeferredView(load);
    const route = (
      <StrictMode>
        <DeferredView />
      </StrictMode>
    );

    await act(async () => root.render(route));
    act(() => root.render(<main>Another route</main>));
    await act(async () => root.render(route));

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).not.toBeNull();

    await act(async () => {
      pendingModule.resolve({ default: () => <main>Replacement route ready</main> });
      await pendingModule.promise;
    });

    expect(container.textContent).toBe('Replacement route ready');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('localizes the visible loading state in Spanish', async () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const DeferredView = createDeferredView(() => createPendingModule().promise);

    await act(async () => {
      root.render(<DeferredView />);
    });

    expect(container.textContent).toContain('Cargando vista…');
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
  });

  it.each([
    { name: 'an Error', reason: new Error('route import failed') },
    { name: 'null', reason: null },
    { name: 'undefined', reason: undefined },
  ])('propagates a module rejected with $name to the existing boundary', async ({ reason }) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pendingModule = createPendingModule();
    const DeferredView = createDeferredView(() => pendingModule.promise);

    await act(async () => {
      root.render(
        <PluginContributionBoundary resetKey="route" fallback={<p>Route unavailable</p>}>
          <DeferredView />
        </PluginContributionBoundary>
      );
    });

    await act(async () => {
      pendingModule.reject(reason);
      await pendingModule.promise.catch(() => undefined);
    });

    expect(container.textContent).toBe('Route unavailable');
    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).toBeNull();
  });
});
