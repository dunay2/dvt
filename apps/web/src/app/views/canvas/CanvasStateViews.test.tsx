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
  {
    kind: 'dvt:sink',
    pluginId: 'dvt',
    label: 'Sink',
    role: 'output',
    icon: Square,
    borderClass: 'border-emerald-500',
    minimapColor: '#10b981',
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
];

function renderEmptyState(props: Partial<React.ComponentProps<typeof CanvasEmptyStateView>> = {}): {
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
        {...props}
      />
    );
  });

  return { container, onCreateAuthoringNode, root };
}

describe('CanvasEmptyStateView', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('keeps the empty authoring guide from blocking canvas gestures outside the card', async () => {
    const { container, root } = renderEmptyState();

    const frame = container.querySelector('[data-slot="canvas-empty-state-frame"]');
    const card = container.querySelector('[data-slot="canvas-empty-state"]');

    expect(frame?.className).toContain('pointer-events-none');
    expect(card?.className).toContain('pointer-events-auto');

    act(() => root.unmount());
  });

  it('opens the on-demand authoring palette instead of exposing a permanent node rail', async () => {
    const { container, onCreateAuthoringNode, root } = renderEmptyState();

    expect(container.textContent).not.toContain('SQL transform');

    await clickButton(container, 'Add first transformation node');

    expect(document.body.querySelector('[data-slot="canvas-add-node-palette"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Source');
    expect(document.body.textContent).toContain('SQL transform');

    await setPaletteSearch('sql');
    await submitPaletteSearch();

    expect(onCreateAuthoringNode).toHaveBeenCalledWith(nodeKinds[1]);
    act(() => root.unmount());
  });

  it('offers governed transformation and output templates before the first node exists', async () => {
    const { container, onCreateAuthoringNode, root } = renderEmptyState();

    await clickButton(container, 'Add first transformation node');
    await setPaletteSearch('join');
    await clickButton(document.body, 'Join sources');
    expect(onCreateAuthoringNode).toHaveBeenCalledWith(
      nodeKinds[1],
      undefined,
      expect.objectContaining({
        namePrefix: 'Join sources',
        metadata: expect.objectContaining({
          transformationTemplateId: 'join-sources',
          sql: expect.stringContaining('join'),
        }),
      })
    );

    await clickButton(container, 'Add first transformation node');
    await setPaletteSearch('append');
    await clickButton(document.body, 'Append fact table');
    expect(onCreateAuthoringNode).toHaveBeenCalledWith(
      nodeKinds[2],
      undefined,
      expect.objectContaining({
        namePrefix: 'Append fact table',
        metadata: expect.objectContaining({
          outputTargetTemplateId: 'analytics-table-append',
          config: expect.objectContaining({
            schema: 'analytics',
            table: 'fact_transformed_events',
            materialization: 'table',
            writeMode: 'append',
          }),
        }),
      })
    );
    act(() => root.unmount());
  });

  it('exposes a checked guide visibility control that can hide the empty-state guide', async () => {
    const onEmptyStateGuideVisibilityChange = vi.fn();
    const { container, root } = renderEmptyState({
      emptyStateGuideVisible: true,
      onEmptyStateGuideVisibilityChange,
    });

    const preference = container.querySelector<HTMLInputElement>(
      '[data-slot="canvas-empty-guide-preference"]'
    );

    expect(preference).not.toBeNull();
    expect(preference?.checked).toBe(true);

    await act(async () => {
      preference?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onEmptyStateGuideVisibilityChange).toHaveBeenCalledWith(false);
    act(() => root.unmount());
  });
});

async function clickButton(scope: ParentNode, label: string): Promise<void> {
  const button = Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  expect(button, label).toBeDefined();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function setPaletteSearch(value: string): Promise<void> {
  const search = document.body.querySelector<HTMLInputElement>(
    '[data-slot="canvas-add-node-palette-search"]'
  );
  expect(search).not.toBeNull();

  await act(async () => {
    search?.focus();
    if (search) {
      search.value = value;
    }
    search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
  });
}

async function submitPaletteSearch(): Promise<void> {
  const search = document.body.querySelector<HTMLInputElement>(
    '[data-slot="canvas-add-node-palette-search"]'
  );
  expect(search).not.toBeNull();

  await act(async () => {
    search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
}
