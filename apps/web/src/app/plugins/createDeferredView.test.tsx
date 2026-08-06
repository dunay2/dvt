// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { createDeferredView } from './createDeferredView';

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
  });

  it('renders the route view after its deferred module resolves', async () => {
    let resolveModule!: (module: Readonly<{ default: React.ComponentType }>) => void;
    const modulePromise = new Promise<Readonly<{ default: React.ComponentType }>>((resolve) => {
      resolveModule = resolve;
    });
    const DeferredView = createDeferredView(() => modulePromise);

    await act(async () => {
      root.render(<DeferredView />);
    });

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).not.toBeNull();
    expect(container.textContent).toContain('Loading view…');

    await act(async () => {
      resolveModule({ default: () => <main>Loaded route</main> });
      await modulePromise;
    });

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).toBeNull();
    expect(container.textContent).toContain('Loaded route');
  });

  it('localizes the visible loading state in Spanish', async () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const DeferredView = createDeferredView(
      () => new Promise<Readonly<{ default: React.ComponentType }>>(() => undefined)
    );

    await act(async () => {
      root.render(<DeferredView />);
    });

    expect(container.textContent).toContain('Cargando vista…');
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
  });
});
