// @vitest-environment jsdom

/** Owned concern: prove selected-node draft reconciliation independently from workbench rendering. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
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

const DVT_TRANSFORM_NODE: CanonicalNode = {
  id: 'transform.orders',
  name: 'Clean Orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['authoring'],
  metadata: {
    config: {
      dialect: 'postgres',
      sql: 'select * from raw.orders',
      selectedColumns: ['source.orders.order_id'],
    },
  },
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

  it('keeps semantic authoring tags outside the business-tag editor and preserves them', async () => {
    await harness.renderNode({
      ...DVT_TRANSFORM_NODE,
      tags: ['authoring', 'template:filter-rows', 'target:reporting-view-replace', 'finance'],
    });

    expect(harness.getController().tagsText).toBe('finance');

    await act(async () => {
      harness
        .getController()
        .onTagsTextChange('critical, authoring, template:override, target:override');
    });

    expect(harness.getController().draft.tags).toEqual([
      'authoring',
      'template:filter-rows',
      'target:reporting-view-replace',
      'critical',
    ]);
    expect(harness.getController().tagsText).toBe(
      'critical, authoring, template:override, target:override'
    );
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

  it('accepts canonical no-SQL authority after an empty SQL draft is applied', async () => {
    await harness.renderNode(MODEL_NODE);

    await act(async () => {
      harness.getController().onDraftChange((currentDraft) => ({
        ...currentDraft,
        dbt: currentDraft.dbt ? { ...currentDraft.dbt, modelSql: '' } : undefined,
      }));
      harness.getController().onDraftSubmitted();
    });
    await harness.renderNode({
      ...MODEL_NODE,
      metadata: {
        config: {},
      },
    });

    expect(harness.getController().draft.dbt?.modelSql).toBeNull();
  });

  it('accepts every normalization performed by the submitted authoring command', async () => {
    await harness.renderNode(MODEL_NODE);

    await act(async () => {
      harness.getController().onDraftChange((currentDraft) => ({
        ...currentDraft,
        name: '  Orders Mart  ',
        description: '  Governed model  ',
        tags: [' mart ', 'daily', 'mart'],
        dbt: currentDraft.dbt
          ? {
              ...currentDraft.dbt,
              packageName: '  finance  ',
              sourceName: ' Raw Orders ',
              schemaName: '  curated  ',
              tableName: ' Order Lines ',
              selectedSourceId: '  source.orders  ',
              modelSql: '',
            }
          : undefined,
      }));
    });
    const submittedDraft = harness.getController().draft;
    await act(async () => {
      harness.getController().onDraftSubmitted();
    });
    await harness.renderNode(applyCanvasInspectorNodeDraft(MODEL_NODE, submittedDraft));

    expect(harness.getController().draft).toMatchObject({
      name: 'Orders Mart',
      description: 'Governed model',
      tags: ['mart', 'daily'],
      dbt: {
        packageName: 'finance',
        sourceName: 'raw_orders',
        schemaName: 'curated',
        tableName: 'order_lines',
        selectedSourceId: 'source.orders',
        modelSql: null,
      },
    });
  });

  it('reopens submitted DVT SQL from authority without rewriting historical column metadata', async () => {
    await harness.renderNode(DVT_TRANSFORM_NODE);

    await act(async () => {
      harness.getController().onDraftChange((currentDraft) => ({
        ...currentDraft,
        dvt:
          currentDraft.dvt?.kind === 'transform'
            ? { ...currentDraft.dvt, sql: 'select order_id from raw.orders' }
            : currentDraft.dvt,
      }));
    });
    const submittedDraft = harness.getController().draft;
    await act(async () => {
      harness.getController().onDraftSubmitted();
    });
    const appliedNode = applyCanvasInspectorNodeDraft(DVT_TRANSFORM_NODE, submittedDraft);
    await harness.renderNode(appliedNode);

    expect(harness.getController().draft.dvt).toEqual({
      kind: 'transform',
      mode: 'sql',
      sql: 'select order_id from raw.orders',
    });
    expect(appliedNode.metadata?.config).toMatchObject({
      dialect: 'postgres',
      sql: 'select order_id from raw.orders',
      selectedColumns: ['source.orders.order_id'],
    });
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
