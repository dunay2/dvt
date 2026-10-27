// @vitest-environment jsdom

/** Owned concern: prove accessible localized navigation and controls in the compact Workbench header. */
import { fireEvent, getByRole } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

const NODE: CanonicalNode = {
  id: 'model.orders',
  name: 'Orders Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
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

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    vi.clearAllMocks();
  });

  async function renderPanel(
    onClose = vi.fn(),
    onOpenSemanticEditor = vi.fn()
  ): Promise<ReturnType<typeof vi.fn>> {
    await act(async () => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE]}
          edges={[]}
          activeRunId={null}
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
          onOpenSemanticEditor={onOpenSemanticEditor}
          onClose={onClose}
        />
      );
    });
    return onClose;
  }

  it('keeps one semantic icon before help and close without duplicating section actions', async () => {
    const onOpenSemanticEditor = vi.fn();
    const onClose = await renderPanel(vi.fn(), onOpenSemanticEditor);
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
    const openEditor = getByRole(actions!, 'button', { name: 'Open semantic editor' });

    expect(actions).not.toBeNull();
    expect(dragHandle).toBeNull();
    expect(openEditor.tagName).toBe('BUTTON');
    expect(openEditor.getAttribute('type')).toBe('button');
    expect(openEditor.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('[data-slot="canvas-open-semantic-editor"]')).toHaveLength(1);
    const general = container.querySelector('[data-slot="canvas-node-workbench-general-content"]');
    expect(general).not.toBeNull();
    expect(general?.querySelector('[data-slot="canvas-open-semantic-editor"]')).toBeNull();
    expect(help?.getAttribute('aria-label')).toBe('Editable properties');
    expect(close?.getAttribute('aria-label')).toBe('Close');
    expect(help?.querySelector('svg')).not.toBeNull();
    expect(close?.querySelector('svg')).not.toBeNull();
    expect(Array.from(actions!.querySelectorAll('button'))).toEqual([openEditor, help, close]);

    await act(async () => fireEvent.click(openEditor));
    expect(onOpenSemanticEditor).toHaveBeenCalledOnce();

    await act(async () => {
      fireEvent.click(close!);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the existing localized name for the Spanish semantic icon', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    await renderPanel();
    const openEditor = getByRole(container, 'button', { name: 'Abrir editor semántico' });
    expect(openEditor.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

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
