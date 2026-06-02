// @vitest-environment jsdom

import { Circle, Square } from 'lucide-react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { CanvasEmptyStateView } from './CanvasStateViews';

const nodeKinds: readonly NodeKindRegistration[] = [
  {
    kind: 'dvt:source',
    pluginId: 'dvt',
    label: 'Source',
    role: 'input',
    icon: Circle,
    borderClass: 'border-sky-500',
    minimapColor: '#0ea5e9',
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: true,
  },
  {
    kind: 'dvt:sql_transform',
    pluginId: 'dvt',
    label: 'SQL transform',
    role: 'transform',
    icon: Square,
    borderClass: 'border-violet-500',
    minimapColor: '#8b5cf6',
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: true,
  },
];

function renderEmptyState(): {
  container: HTMLDivElement;
  onCreateAuthoringNode: ReturnType<typeof vi.fn>;
  root: Root;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onCreateAuthoringNode = vi.fn();

  act(() => {
    root.render(
      <CanvasEmptyStateView
        title="Start transformation canvas"
        message="Start transformation authoring"
        firstNodeLabel="Add first transformation node"
        firstNodeHelper="Choose a transformation node."
        nodeKinds={nodeKinds}
        onCreateAuthoringNode={onCreateAuthoringNode}
      />
    );
  });

  return { container, onCreateAuthoringNode, root };
}

describe('Canvas empty state Insert/Add palette', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('opens an on-demand searchable node palette instead of exposing a permanent node rail', async () => {
    const { container, onCreateAuthoringNode, root } = renderEmptyState();
    const trigger = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add first transformation node')
    );

    expect(trigger).toBeDefined();
    expect(container.textContent).not.toContain('SQL transform');

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const palette = document.body.querySelector('[data-slot="canvas-add-node-palette"]');
    const search = document.body.querySelector<HTMLInputElement>(
      '[data-slot="canvas-add-node-palette-search"]'
    );

    expect(palette).not.toBeNull();
    expect(search).not.toBeNull();
    expect(document.body.textContent).toContain('Source');
    expect(document.body.textContent).toContain('SQL transform');

    await act(async () => {
      search?.focus();
      if (search) {
        search.value = 'sql';
      }
      search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'sql' }));
    });

    await act(async () => {
      search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onCreateAuthoringNode).toHaveBeenCalledTimes(1);
    expect(onCreateAuthoringNode).toHaveBeenCalledWith(nodeKinds[1]);

    act(() => {
      root.unmount();
    });
  });

  it('keeps terse authoring node kinds discoverable through semantic palette search', async () => {
    const semanticNodeKinds: readonly NodeKindRegistration[] = [
      {
        ...nodeKinds[0],
        kind: 'dbt:source',
        pluginId: 'dbt',
        label: 'Source',
      },
      {
        ...nodeKinds[1],
        kind: 'dbt:model',
        pluginId: 'dbt',
        label: 'Model',
        role: 'transform',
      },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <CanvasEmptyStateView
          title="Start dbt canvas"
          message="Start dbt authoring"
          firstNodeLabel="Insert"
          firstNodeHelper="Choose a dbt node."
          nodeKinds={semanticNodeKinds}
          onCreateAuthoringNode={vi.fn()}
        />
      );
    });

    const trigger = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Insert')
    );

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const search = document.body.querySelector<HTMLInputElement>(
      '[data-slot="canvas-add-node-palette-search"]'
    );

    await act(async () => {
      search?.focus();
      if (search) {
        search.value = 'authoring';
      }
      search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'authoring' }));
    });

    expect(document.body.textContent).toContain('Source');
    expect(document.body.textContent).toContain('Model');
    expect(document.body.querySelector('[data-slot="canvas-add-node-palette-empty"]')).toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
