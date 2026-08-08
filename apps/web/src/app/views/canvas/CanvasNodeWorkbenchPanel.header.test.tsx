// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('CanvasNodeWorkbenchPanel header actions', () => {
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
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('keeps contextual help and close as right-side accessible icon actions', () => {
    const onClose = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE]}
          edges={[]}
          activeRunId={null}
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
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
    expect(help?.getAttribute('aria-label')).toBe('Editable properties');
    expect(help?.querySelector('svg')).not.toBeNull();
    expect(close?.getAttribute('aria-label')).toBe('Close');
    expect(close?.querySelector('svg')).not.toBeNull();
    expect(dragHandle?.contains(actions!)).toBe(false);

    act(() => {
      fireEvent.click(close!);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
