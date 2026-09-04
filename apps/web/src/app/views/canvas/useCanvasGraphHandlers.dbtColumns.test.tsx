// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import {
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
} from './useCanvasGraphHandlers.test.support';

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};

const model: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { dbt: { selectedSourceId: source.id } },
};

describe('Canvas DBT model column handlers', () => {
  beforeEach(resetGraphHandlersTestDoubles);
  afterEach(restoreGraphHandlersTestDoubles);

  it('routes an output toggle through the DBT node authoring command', async () => {
    const setDraftSession = vi.fn();
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [source.id, model.id],
        visibleEdges: [{ sourceId: source.id, targetId: model.id }],
        pendingExplicitNodeIds: [],
      },
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, model],
      draftSession,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleToggleCanvasColumnOutput({
        nodeId: model.id,
        columnId: 'customer',
        columnType: 'text',
        output: false,
      });
    });

    const updatedSession = setDraftSession.mock.calls[0]?.[0];
    const updatedModel = updatedSession?.localNodeCatalog?.[model.id];
    expect(updatedModel).toBeDefined();
    if (updatedModel == null) {
      harness.cleanup();
      return;
    }
    expect(createDbtNodeAuthoringMetadata(updatedModel).projectionColumns).toEqual([
      { name: 'order_id', output: true },
      { name: 'customer', output: false },
    ]);

    harness.cleanup();
  });

  it('removes a DBT field connection by disabling the target output', async () => {
    const setDraftSession = vi.fn();
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [source.id, model.id],
        visibleEdges: [{ sourceId: source.id, targetId: model.id }],
        pendingExplicitNodeIds: [],
      },
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, model],
      draftSession,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleRemoveColumnMapping({
        kind: 'column-lineage',
        sourceNodeId: source.id,
        sourceFieldId: 'external-dbt-field:customer',
        sourceColumnName: 'customer',
        targetNodeId: model.id,
        targetColumnName: 'customer',
        outputId: 'customer',
        removable: true,
      });
    });

    const updatedModel = setDraftSession.mock.calls[0]?.[0]?.localNodeCatalog?.[model.id];
    expect(updatedModel).toBeDefined();
    if (updatedModel != null) {
      expect(createDbtNodeAuthoringMetadata(updatedModel).projectionColumns).toEqual([
        { name: 'order_id', output: true },
        { name: 'customer', output: false },
      ]);
    }

    harness.cleanup();
  });

  it('routes column reorder through the DBT node authoring command', async () => {
    const setDraftSession = vi.fn();
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [source.id, model.id],
        visibleEdges: [{ sourceId: source.id, targetId: model.id }],
        pendingExplicitNodeIds: [],
      },
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, model],
      draftSession,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleReorderCanvasColumnOutput({
        nodeId: model.id,
        columnId: 'customer',
        targetColumnId: 'order_id',
        placement: 'before',
      });
    });

    const updatedModel = setDraftSession.mock.calls[0]?.[0]?.localNodeCatalog?.[model.id];
    expect(updatedModel).toBeDefined();
    if (updatedModel != null) {
      expect(createDbtNodeAuthoringMetadata(updatedModel).projectionColumns).toEqual([
        { name: 'customer', output: true },
        { name: 'order_id', output: true },
      ]);
    }

    harness.cleanup();
  });
});
