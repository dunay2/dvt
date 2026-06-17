// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDvtInspectorNode,
  buildInspectorNode,
  renderInspectorPanel,
} from './CanvasInspectorPanel.test.support';
import type { CanonicalNode } from '../../types/canonical';

describe('CanvasInspectorPanel authoring contract', () => {
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

  it('applies a validated route-owned node draft', async () => {
    const onApplyNodeDraft = vi.fn();

    await act(async () => {
      renderInspectorPanel(root, {
        node: buildInspectorNode(),
        nodes: [],
        authoring: {
          canEditNode: true,
          onApplyNodeDraft,
        },
      });
    });

    const nameInput = container.querySelector('input[name="node-name"]') as HTMLInputElement | null;
    const descriptionInput = container.querySelector(
      'textarea[name="node-description"]'
    ) as HTMLTextAreaElement | null;
    const tagsInput = container.querySelector('input[name="node-tags"]') as HTMLInputElement | null;

    expect(nameInput?.value).toBe('orders_source');
    expect(descriptionInput?.value).toBe('Orders source table');
    expect(tagsInput?.value).toBe('');

    await act(async () => {
      fireEvent.input(nameInput!, { target: { value: 'orders_source_v2' } });
      fireEvent.input(tagsInput!, { target: { value: 'finance, critical' } });
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith({
      name: 'orders_source_v2',
      description: 'Orders source table',
      tags: ['finance', 'critical'],
      dvt: {
        kind: 'source',
        schema: 'public',
        table: 'orders_source',
        alias: 'orders_source',
      },
    });
  });

  it('keeps the route-owned node draft read-only when mutation is unavailable', async () => {
    await act(async () => {
      renderInspectorPanel(root, {
        node: buildInspectorNode(),
        nodes: [],
        authoring: {
          canEditNode: false,
          onApplyNodeDraft: vi.fn(),
        },
      });
    });

    const nameInput = container.querySelector('input[name="node-name"]');
    const tagsInput = container.querySelector('input[name="node-tags"]');
    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    expect(nameInput?.getAttribute('disabled')).not.toBeNull();
    expect(tagsInput?.getAttribute('disabled')).not.toBeNull();
    expect(applyButton).toBeUndefined();
  });

  it('resets dirty controls synchronously when the selected node changes', async () => {
    const firstNode = {
      ...buildDvtInspectorNode('dvt:source', {
        config: {
          schema: 'raw',
          table: 'orders',
          alias: 'orders',
        },
      }),
      id: 'source-orders',
      name: 'Orders Source',
    };
    const secondNode = {
      ...buildDvtInspectorNode('dvt:source', {
        config: {
          schema: 'raw',
          table: 'customers',
          alias: 'customers',
        },
      }),
      id: 'source-customers',
      name: 'Customers Source',
    };
    const onApplyNodeDraft = vi.fn();
    const renderPanel = (node: CanonicalNode): void =>
      renderInspectorPanel(root, {
        node,
        nodes: [firstNode, secondNode],
        authoring: {
          canEditNode: true,
          onApplyNodeDraft,
        },
      });

    await act(async () => {
      renderPanel(firstNode);
    });

    const schemaInput = container.querySelector(
      'input[name="dvt-source-schema"]'
    ) as HTMLInputElement | null;

    await act(async () => {
      fireEvent.input(schemaInput!, { target: { value: 'analytics' } });
    });

    expect(container.textContent).toContain('Apply');

    act(() => {
      flushSync(() => {
        renderPanel(secondNode);
      });

      expect(container.textContent).toContain('Customers Source');
      expect(container.textContent).not.toContain('Apply');
      expect(container.textContent).not.toContain('Cancel');
    });
  });
});
