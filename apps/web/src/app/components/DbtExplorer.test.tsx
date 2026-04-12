// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DbtExplorer from './DbtExplorer';
import type { CanonicalNode } from '../types/canonical';

const mockResolveNodeKindRegistration = vi.hoisted(() => vi.fn());

vi.mock('../plugins/nodeTypeRegistry', () => ({
  resolveNodeKindRegistration: mockResolveNodeKindRegistration,
}));

function buildNode(): CanonicalNode {
  return {
    id: 'node.orders',
    name: 'orders',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform' as const,
    status: 'idle' as const,
    tags: [],
  };
}

describe('DbtExplorer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockResolveNodeKindRegistration.mockImplementation(() => ({
      label: 'Model',
      minimapColor: '#22c55e',
      icon: () => <span data-testid="kind-icon" />,
    }));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('keeps drag affordances and import guidance when graph edits are allowed', async () => {
    await act(async () => {
      root.render(
        <DbtExplorer
          nodes={[buildNode()]}
          canEditGraph={true}
          onHide={vi.fn()}
          onOpenDataRegistry={vi.fn()}
        />
      );
    });

    const draggableNode = container.querySelector('[draggable="true"]');

    expect(container.textContent).toContain('Drag resources into the graph');
    expect(container.textContent).toContain('Add data');
    expect(draggableNode).not.toBeNull();
    expect(draggableNode?.className).toContain('cursor-move');
  });

  it('removes drag affordances and import guidance when graph edits are gated', async () => {
    await act(async () => {
      root.render(
        <DbtExplorer
          nodes={[buildNode()]}
          canEditGraph={false}
          onHide={vi.fn()}
          onOpenDataRegistry={vi.fn()}
        />
      );
    });

    const draggableNode = container.querySelector('[draggable="false"]');

    expect(container.textContent).toContain('Inspect available project resources');
    expect(container.textContent).not.toContain('Add data');
    expect(draggableNode?.getAttribute('draggable')).toBe('false');
    expect(draggableNode?.className).toContain('cursor-default');
  });
});
