// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import ArtifactsView from './ArtifactsView';

describe('ArtifactsView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('renders import area, server artifacts and preview tabs', async () => {
    await act(async () => {
      root.render(<ArtifactsView />);
    });

    expect(container.textContent).toContain('dbt Artifacts');
    expect(container.textContent).toContain('Import Manifest');
    expect(container.textContent).toContain('Drop manifest.json here');
    expect(container.textContent).toContain('Server Artifacts');
    expect(container.textContent).toContain('manifest.json');
    expect(container.textContent).toContain('run_results.json');
    expect(container.textContent).toContain('catalog.json');
    expect(container.textContent).toContain('About dbt Artifacts');
  });
});
