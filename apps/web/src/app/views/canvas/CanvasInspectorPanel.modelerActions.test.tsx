// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import type { CanonicalNode } from '../../types/canonical';

describe('CanvasInspectorPanel modeler actions', () => {
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

  function buildDbtModelNode(): CanonicalNode {
    return {
      id: 'model-orders',
      name: 'Orders Model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'view',
        },
      },
    };
  }

  function modelerActionButton(actionId: string): HTMLButtonElement {
    const button = container.querySelector<HTMLButtonElement>(`[data-action-id="${actionId}"]`);

    if (!button) {
      throw new Error(`Modeler action button not found: ${actionId}`);
    }

    return button;
  }

  it('runs modeler actions from the properties panel through route-owned node handlers', async () => {
    const node = buildDbtModelNode();
    const onDuplicateNode = vi.fn();
    const onToggleNodeSelection = vi.fn();
    const onRemoveNode = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={node}
          nodes={[node]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
            modelerActions: {
              selectedForExecution: false,
              onDuplicateNode,
              onToggleNodeSelection,
              onRemoveNode,
            },
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="node-inspector-modeler-actions"]')).not.toBeNull();

    await act(async () => {
      fireEvent.click(modelerActionButton('select-node-for-execution'));
      fireEvent.click(modelerActionButton('duplicate-node'));
      fireEvent.click(modelerActionButton('remove-node'));
    });

    expect(onToggleNodeSelection).toHaveBeenCalledWith(node.id, true);
    expect(onDuplicateNode).toHaveBeenCalledWith(node.id);
    expect(onRemoveNode).toHaveBeenCalledWith(node.id);
  });

  it('keeps execution selection available when graph editing is read-only', async () => {
    const node = buildDbtModelNode();
    const onToggleNodeSelection = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={node}
          nodes={[node]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
            modelerActions: {
              selectedForExecution: false,
              onDuplicateNode: vi.fn(),
              onToggleNodeSelection,
              onRemoveNode: vi.fn(),
            },
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="node-inspector-modeler-actions"]')).not.toBeNull();
    expect(container.querySelector('[data-action-id="select-node-for-execution"]')).not.toBeNull();
    expect(container.querySelector('[data-action-id="duplicate-node"]')).toBeNull();
    expect(container.querySelector('[data-action-id="remove-node"]')).toBeNull();

    await act(async () => {
      fireEvent.click(modelerActionButton('select-node-for-execution'));
    });

    expect(onToggleNodeSelection).toHaveBeenCalledWith(node.id, true);
  });

  it('does not expose modeler actions when read-only execution selection is unavailable', async () => {
    const node = buildDbtModelNode();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={node}
          nodes={[node]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
            modelerActions: {
              selectedForExecution: false,
              onDuplicateNode: vi.fn(),
              onRemoveNode: vi.fn(),
            },
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="node-inspector-modeler-actions"]')).toBeNull();
    expect(container.querySelector('[data-action-id="select-node-for-execution"]')).toBeNull();
    expect(container.querySelector('[data-action-id="duplicate-node"]')).toBeNull();
    expect(container.querySelector('[data-action-id="remove-node"]')).toBeNull();
  });
});
