// @vitest-environment jsdom

/** Owned concern: prove the contextual Workbench header exposes compact localized help and close controls. */
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

const NODE: CanonicalNode = {
  id: 'source.orders',
  name: 'Orders Source',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    database: 'analytics',
    schema: 'raw',
    tableName: 'orders',
  },
};

describe('CanvasNodeWorkbenchPanel header hardening', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.clearAllMocks();
  });

  function renderPanel(onClose = vi.fn()): ReturnType<typeof vi.fn> {
    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE]}
          edges={[]}
          activeRunId={null}
          authoring={{ nodeDraftAuthoring: { apply: vi.fn() } }}
          dragHandleProps={{
            'aria-label': 'Move node workbench',
            'data-slot': 'canvas-node-workbench-drag-handle',
            role: 'button',
            tabIndex: 0,
          }}
          onClose={onClose}
        />
      );
    });
    return onClose;
  }

  it('keeps contextual help and close as right-side accessible actions outside the drag handle', () => {
    const onClose = renderPanel();
    const actions = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-header-actions"]'
    );
    const dragHandle = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-drag-handle"]'
    );
    const help = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-node-workbench-help"]'
    );
    const close = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-node-workbench-close"]'
    );

    expect(actions).not.toBeNull();
    expect(actions?.className).toContain('ml-auto');
    expect(dragHandle?.contains(actions!)).toBe(false);
    expect(help?.getAttribute('aria-label')).toBe('Editable properties');
    expect(close?.getAttribute('aria-label')).toBe('Close');
    expect(help?.querySelector('svg')).not.toBeNull();
    expect(close?.querySelector('svg')).not.toBeNull();
    expect(help?.compareDocumentPosition(close!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    act(() => {
      fireEvent.click(close!);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the existing Canvas localization owner for Spanish help and close labels', () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    renderPanel();

    expect(
      container
        .querySelector('[data-slot="canvas-node-workbench-help"]')
        ?.getAttribute('aria-label')
    ).toBe('Propiedades editables');
    expect(
      container
        .querySelector('[data-slot="canvas-node-workbench-close"]')
        ?.getAttribute('aria-label')
    ).toBe('Cerrar');
  });
});
