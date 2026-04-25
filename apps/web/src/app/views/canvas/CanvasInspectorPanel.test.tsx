// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import type { CanonicalNode } from '../../types/canonical';

function buildNode(): CanonicalNode {
  return {
    id: 'node_1',
    name: 'orders_source',
    description: 'Orders source table',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

describe('CanvasInspectorPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('exposes a route-owned editable properties form and applies validated changes', async () => {
    const onApplyNodeDraft = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={buildNode()}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft,
          }}
        />
      );
    });

    const nameInput = container.querySelector('input[name="node-name"]') as HTMLInputElement | null;
    const descriptionInput = container.querySelector(
      'textarea[name="node-description"]'
    ) as HTMLTextAreaElement | null;

    expect(nameInput?.value).toBe('orders_source');
    expect(descriptionInput?.value).toBe('Orders source table');

    await act(async () => {
      if (nameInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(nameInput, 'orders_source_v2');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    expect(container.textContent).toContain('Apply');
    expect(container.textContent).toContain('Cancel');

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith({
      name: 'orders_source_v2',
      description: 'Orders source table',
    });
  });

  it('keeps the form read-only when the route cannot mutate node properties', async () => {
    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={buildNode()}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
          }}
        />
      );
    });

    const nameInput = container.querySelector('input[name="node-name"]');
    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    expect(nameInput?.getAttribute('disabled')).not.toBeNull();
    expect(applyButton).toBeUndefined();
  });
});
