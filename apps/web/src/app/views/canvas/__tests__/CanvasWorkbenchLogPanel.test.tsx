/** Owned concern: prove Canvas workbench log panel renders the query read model. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { CanvasWorkbenchLogPanel } from '../CanvasWorkbenchLogPanel';

describe('CanvasWorkbenchLogPanel', () => {
  it('renders dense operational log rows without creating controls for empty history', () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root: Root = createRoot(container);

    act(() => {
      root.render(
        <CanvasWorkbenchLogPanel
          logState={{
            rail: 'ListCanvasWorkbenchLogEntries',
            entries: [
              {
                id: 'route:ready:canvas-is-ready',
                severity: 'info',
                source: 'route',
                message: 'Canvas is ready',
                detail: 'ready',
              },
              {
                id: 'draft:save_failed:write-failed',
                severity: 'error',
                source: 'draft',
                message: 'The protected draft write failed.',
                detail: 'save_failed',
              },
            ],
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-workbench-log-panel"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-workbench-log-entry"]')).toHaveLength(2);
    expect(container.textContent).toContain('Canvas is ready');
    expect(container.textContent).toContain('The protected draft write failed.');
    expect(container.textContent).toContain('route');
    expect(container.textContent).toContain('draft');

    act(() => root.unmount());
    container.remove();
  });

  it('renders an empty current-state message when there are no entries', () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root: Root = createRoot(container);

    act(() => {
      root.render(
        <CanvasWorkbenchLogPanel
          logState={{
            rail: 'ListCanvasWorkbenchLogEntries',
            entries: [],
          }}
        />
      );
    });

    expect(container.querySelectorAll('[data-slot="canvas-workbench-log-entry"]')).toHaveLength(0);
    expect(container.textContent).toContain('No current Canvas messages.');

    act(() => root.unmount());
    container.remove();
  });
});
