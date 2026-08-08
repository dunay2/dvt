// @vitest-environment jsdom

/** Owned concern: prove the contextual Workbench header exposes compact localized help and close controls. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

const NODE: CanonicalNode = {
  id: 'source.orders',
  name: 'Orders Source',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {},
};

function renderPanel(root: Root): void {
  act(() => {
    root.render(
      <CanvasNodeWorkbenchPanel
        node={NODE}
        nodes={[NODE]}
        edges={[]}
        activeRunId={null}
        authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
        onClose={vi.fn()}
      />
    );
  });
}

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

  it('renders help before close as separate labelled icon controls', () => {
    renderPanel(root);

    const helpButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-node-workbench-help"]'
    );
    const closeButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-node-workbench-close"]'
    );

    expect(helpButton).not.toBeNull();
    expect(closeButton).not.toBeNull();
    expect(helpButton?.getAttribute('aria-label')).toBe('Node workbench help');
    expect(closeButton?.getAttribute('aria-label')).toBe('Close');
    expect(helpButton?.querySelector('svg')).not.toBeNull();
    expect(closeButton?.querySelector('svg')).not.toBeNull();
    expect(helpButton?.compareDocumentPosition(closeButton!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('switches the help label with the application language without changing the control owner', () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    renderPanel(root);

    expect(
      container
        .querySelector('[data-slot="canvas-node-workbench-help"]')
        ?.getAttribute('aria-label')
    ).toBe('Ayuda del banco de trabajo');
    expect(
      container
        .querySelector('[data-slot="canvas-node-workbench-close"]')
        ?.getAttribute('aria-label')
    ).toBe('Cerrar');
  });
});
