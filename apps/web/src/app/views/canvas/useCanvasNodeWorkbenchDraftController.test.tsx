// @vitest-environment jsdom

/** Owned concern: prove selected-node draft reconciliation independently from workbench rendering. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  useCanvasNodeWorkbenchDraftController,
  type CanvasNodeWorkbenchDraftController,
} from './useCanvasNodeWorkbenchDraftController';

const MODEL_NODE: CanonicalNode = {
  id: 'model.orders',
  name: 'Orders Model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: ['mart'],
  metadata: {
    config: {
      sql: 'select * from {{ ref("orders") }}',
    },
  },
};

const OTHER_MODEL_NODE: CanonicalNode = {
  ...MODEL_NODE,
  id: 'model.customers',
  name: 'Customers Model',
  tags: ['customer'],
};

function ControllerHarness({
  node,
  onController,
}: Readonly<{
  node: CanonicalNode;
  onController: (controller: CanvasNodeWorkbenchDraftController) => void;
}>): null {
  onController(useCanvasNodeWorkbenchDraftController(node));
  return null;
}

function createControllerHarness(): {
  getController: () => CanvasNodeWorkbenchDraftController;
  renderNode: (node: CanonicalNode) => Promise<void>;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let controller: CanvasNodeWorkbenchDraftController | null = null;
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  return {
    getController: () => {
      expect(controller).not.toBeNull();
      return controller as CanvasNodeWorkbenchDraftController;
    },
    renderNode: async (node) => {
      await act(async () => {
        root.render(
          <ControllerHarness
            node={node}
            onController={(nextController) => (controller = nextController)}
          />
        );
      });
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
      controller = null;
    },
  };
}

describe('useCanvasNodeWorkbenchDraftController', () => {
  let harness: ReturnType<typeof createControllerHarness>;

  beforeEach(() => {
    harness = createControllerHarness();
  });

  afterEach(() => {
    harness.unmount();
  });

  it('projects the selected authoritative node into one editable draft', async () => {
    await harness.renderNode(MODEL_NODE);

    expect(harness.getController().draft).toMatchObject({
      name: 'Orders Model',
      tags: ['mart'],
      dbt: {
        modelSql: 'select * from {{ ref("orders") }}',
      },
    });
    expect(harness.getController().tagsText).toBe('mart');
  });

  it('keeps tag text and normalized draft tags in one controller transition', async () => {
    await harness.renderNode(MODEL_NODE);

    await act(async () => {
      harness.getController().onTagsTextChange('mart, daily, mart, ');
    });

    expect(harness.getController().tagsText).toBe('mart, daily, mart, ');
    expect(harness.getController().draft.tags).toEqual(['mart', 'daily']);
  });

  it('updates a clean draft when the same node authoritative snapshot changes', async () => {
    await harness.renderNode(MODEL_NODE);
    await harness.renderNode({
      ...MODEL_NODE,
      name: 'Orders Mart',
      tags: ['mart', 'daily'],
    });

    expect(harness.getController().draft.name).toBe('Orders Mart');
    expect(harness.getController().draft.tags).toEqual(['mart', 'daily']);
    expect(harness.getController().tagsText).toBe('mart, daily');
  });

  it('preserves a dirty empty SQL edit through a same-node authoritative refresh', async () => {
    await harness.renderNode(MODEL_NODE);

    await act(async () => {
      harness.getController().onDraftChange((currentDraft) => ({
        ...currentDraft,
        dbt: currentDraft.dbt ? { ...currentDraft.dbt, modelSql: '' } : undefined,
      }));
    });
    await harness.renderNode({
      ...MODEL_NODE,
      description: 'Refreshed by the graph query',
    });

    expect(harness.getController().draft.dbt?.modelSql).toBe('');
    expect(harness.getController().draft.description).toBe('');
  });

  it('resets a dirty draft to the latest authority on explicit cancel', async () => {
    await harness.renderNode(MODEL_NODE);

    await act(async () => {
      harness.getController().onDraftChange((currentDraft) => ({
        ...currentDraft,
        name: 'Unsaved model name',
      }));
    });
    await harness.renderNode({
      ...MODEL_NODE,
      name: 'Authoritative model name',
      description: 'Latest server description',
    });
    await act(async () => {
      harness.getController().onResetDraft();
    });

    expect(harness.getController().draft.name).toBe('Authoritative model name');
    expect(harness.getController().draft.description).toBe('Latest server description');
  });

  it('drops the previous draft when selection moves to another node', async () => {
    await harness.renderNode(MODEL_NODE);

    await act(async () => {
      harness.getController().onTagsTextChange('temporary, tags');
      harness.getController().onDraftChange((currentDraft) => ({
        ...currentDraft,
        name: 'Unsaved model name',
      }));
    });
    await harness.renderNode(OTHER_MODEL_NODE);

    expect(harness.getController().draft.name).toBe('Customers Model');
    expect(harness.getController().draft.tags).toEqual(['customer']);
    expect(harness.getController().tagsText).toBe('customer');
  });
});
