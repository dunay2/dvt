// @vitest-environment jsdom

import type { Node } from '@xyflow/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';
import { createCanvasColumnHandleId } from './canvasColumnLineageProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  buildDraftSession,
  buildCanonicalNode,
  evaluateGraphHandlerConnectionWith,
  rejectGraphHandlerConnectionWith,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

const HTTP_JSON_ACQUISITION_NODE = {
  id: 'acquire-orders',
  name: 'Acquire orders',
  pluginId: 'dvt.http-json',
  kind: 'dvt:http_json_acquisition',
  role: 'input',
  status: 'idle',
  tags: [],
} satisfies CanonicalNode;

const OBJECT_FILE_LOAD_NODE = {
  id: 'load-orders',
  name: 'Load orders',
  pluginId: 'dvt.object-file-postgres',
  kind: 'dvt:object_file_load',
  role: 'transform',
  status: 'idle',
  tags: [],
} satisfies CanonicalNode;

const HETEROGENEOUS_BRIDGE_CAPABILITIES = {
  plugins: {
    'dvt.http-json': { available: true },
    'dvt.object-file-postgres': { available: true },
  },
} as const;

function buildHeterogeneousBridgeFlowNodes(): Node[] {
  return [
    {
      id: HTTP_JSON_ACQUISITION_NODE.id,
      data: {
        name: HTTP_JSON_ACQUISITION_NODE.name,
        pluginKind: HTTP_JSON_ACQUISITION_NODE.kind,
        role: HTTP_JSON_ACQUISITION_NODE.role,
        status: HTTP_JSON_ACQUISITION_NODE.status,
      },
      position: { x: 0, y: 0 },
    },
    {
      id: OBJECT_FILE_LOAD_NODE.id,
      data: {
        name: OBJECT_FILE_LOAD_NODE.name,
        pluginKind: OBJECT_FILE_LOAD_NODE.kind,
        role: OBJECT_FILE_LOAD_NODE.role,
        status: OBJECT_FILE_LOAD_NODE.status,
      },
      position: { x: 220, y: 0 },
    },
  ];
}

async function useRealConnectionAdmissionRail(): Promise<void> {
  const { evaluateConnection } = await vi.importActual<
    typeof import('../../plugins/contracts/ConnectionRules')
  >('../../plugins/contracts/ConnectionRules');
  evaluateGraphHandlerConnectionWith((source, target, pluginPortMap) =>
    evaluateConnection(source, target, [], pluginPortMap)
  );
}

function buildConnectedPostgresSource(
  id: string,
  columns: readonly Readonly<{ name: string; type: string }>[]
): CanonicalNode {
  return {
    ...buildCanonicalNode(id, 'input'),
    kind: 'dvt:source',
    metadata: {
      schema: 'raw',
      tableName: 'orders',
      columns,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgres',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/dvt/raw/orders',
      },
    },
  };
}

describe('useCanvasGraphHandlers edge authoring', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('rejects edge creation when graph edits are gated', async () => {
    const harness = renderGraphHandlersHook({ canEditEdges: false });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

    harness.cleanup();
  });

  it('routes a pointer column connection into recipe authority without opening node-edge confirmation', async () => {
    const source = buildConnectedPostgresSource('source-node', [
      { name: 'order_id', type: 'integer' },
    ]);
    const model = {
      ...buildCanonicalNode('model-node', 'transform'),
      kind: 'dvt:transform' as const,
    };
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [source.id, model.id],
        visibleEdges: [{ sourceId: source.id, targetId: model.id }],
        pendingExplicitNodeIds: [],
      },
    };
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, model],
      draftSession,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: source.id,
        sourceHandle: createCanvasColumnHandleId({
          direction: 'source',
          nodeId: source.id,
          columnId: 'order_id',
        }),
        target: model.id,
        targetHandle: createCanvasColumnHandleId({
          direction: 'target',
          nodeId: model.id,
          columnId: 'order_id',
        }),
      });
    });

    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof nextSession).toBe('object');
    const mapped = nextSession.localNodeCatalog?.[model.id];
    expect(mapped).toBeDefined();
    expect(readDvtTransformAuthoringAuthority(mapped).mode).toBe('substrait');
    expect(toastState.success).toHaveBeenCalledWith(canvasViewCopy.columnMappingAddedMessage);
    harness.cleanup();
  });

  it('uses the same mapping command for source and target handle keyboard activation', async () => {
    const source = buildConnectedPostgresSource('source-node', [
      { name: 'order_id', type: 'integer' },
    ]);
    const model = {
      ...buildCanonicalNode('model-node', 'transform'),
      kind: 'dvt:transform' as const,
    };
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, model],
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: [source.id, model.id],
          visibleEdges: [{ sourceId: source.id, targetId: model.id }],
          pendingExplicitNodeIds: [],
        },
      },
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleColumnPortActivate({
        direction: 'source',
        nodeId: source.id,
        columnId: 'order_id',
      });
    });
    expect(harness.latest()?.activeColumnHandleId).toBe(
      createCanvasColumnHandleId({
        direction: 'source',
        nodeId: source.id,
        columnId: 'order_id',
      })
    );
    act(() => {
      harness.latest()?.handleColumnPortActivate({
        direction: 'target',
        nodeId: model.id,
        columnId: 'order_id',
      });
    });

    expect(setDraftSession).toHaveBeenCalledTimes(1);
    expect(toastState.info).toHaveBeenCalledWith(
      canvasViewCopy.columnMappingSourceSelectedTemplate.replace('{column}', 'order_id')
    );
    harness.cleanup();
  });

  it('preserves concurrent draft-session state when confirming an edge', async () => {
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const draftSession = buildDraftSession();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      draftSession,
      setEdges,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
      harness.latest()?.confirmEdgeCreation();
    });

    expect(setEdges).toHaveBeenCalledTimes(1);
    const nextEdges = setEdges.mock.calls[0]?.[0];
    expect(typeof nextEdges).not.toBe('function');
    expect(nextEdges).toHaveLength(1);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const updateDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof updateDraftSession).toBe('function');
    const concurrentDraftSession = {
      ...draftSession,
      workingSet: {
        visibleNodeIds: ['source-node', 'sink-node', 'imported-source'],
        visibleEdges: [],
        pendingExplicitNodeIds: ['imported-source'],
      },
    };
    const nextDraftSession = updateDraftSession(concurrentDraftSession);
    expect(nextDraftSession.workingSet.visibleNodeIds).toEqual([
      'source-node',
      'sink-node',
      'imported-source',
    ]);
    expect(nextDraftSession.workingSet.pendingExplicitNodeIds).toEqual(['imported-source']);
    expect(nextDraftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'sink-node' },
    ]);
    expect(toastState.success).toHaveBeenCalledWith(canvasViewCopy.dependencyAddedMessage);

    harness.cleanup();
  });

  it('commits the deterministic mappings produced by stage-edge confirmation', async () => {
    const source = buildConnectedPostgresSource('source-node', [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ]);
    const transform = {
      ...buildCanonicalNode('transform-node', 'transform'),
      kind: 'dvt:transform' as const,
    };
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [source.id, transform.id],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, transform],
      draftSession,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: source.id,
        sourceHandle: null,
        target: transform.id,
        targetHandle: null,
      });
      harness.latest()?.confirmEdgeCreation();
    });

    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const updateDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof updateDraftSession).toBe('function');
    const nextDraftSession = updateDraftSession(draftSession);
    const mappedTransform = nextDraftSession.localNodeCatalog?.[transform.id];
    if (mappedTransform == null) {
      throw new Error('Expected the edge command to commit the mapped transform');
    }
    const authority = readDvtTransformAuthoringAuthority(mappedTransform);
    expect(authority.mode).toBe('substrait');
    if (authority.mode !== 'substrait') return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(
      inspection.projection.outputs.map((output) => ({
        name: output.name,
        sourceFieldName: output.sourceFieldName,
      }))
    ).toEqual([
      { name: 'order_id', sourceFieldName: 'order_id' },
      { name: 'customer', sourceFieldName: 'customer' },
    ]);

    harness.cleanup();
  });

  it('formats cross-plugin bridge rejections at the adapter boundary', async () => {
    rejectGraphHandlerConnectionWith({
      allowed: false,
      reasonCode: 'cross_plugin_bridge_missing',
      sourcePluginId: 'dbt',
      sourceRole: 'input',
      targetPluginId: 'monitoring',
      targetRole: 'output',
    });
    const harness = renderGraphHandlersHook({ canEditEdges: true });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledWith(
      'No compatible data port bridge between dbt (input) and monitoring (output).'
    );
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

    harness.cleanup();
  });

  it.each([
    ['self_connection', canvasViewCopy.connectionSelfNotAllowedMessage],
    ['duplicate_edge', canvasViewCopy.connectionAlreadyExistsMessage],
    ['cycle_detected', canvasViewCopy.connectionCycleDetectedMessage],
  ] as const)(
    'reports %s without mutating the graph draft',
    async (reasonCode, expectedMessage) => {
      rejectGraphHandlerConnectionWith({ allowed: false, reasonCode });
      const setEdges = vi.fn();
      const setDraftSession = vi.fn();
      const harness = renderGraphHandlersHook({
        canEditEdges: true,
        setEdges,
        setDraftSession,
      });
      await harness.render();

      act(() => {
        harness.latest()?.onConnect({
          source: 'source-node',
          sourceHandle: null,
          target: 'sink-node',
          targetHandle: null,
        });
      });

      expect(toastState.error).toHaveBeenCalledWith(expectedMessage);
      expect(setEdges).not.toHaveBeenCalled();
      expect(setDraftSession).not.toHaveBeenCalled();
      expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

      harness.cleanup();
    }
  );

  it('uses visible draft node ports when runtime capabilities omit a node plugin', async () => {
    evaluateGraphHandlerConnectionWith((source, target, pluginPortMap) => {
      if (pluginPortMap.has(source.pluginId) && pluginPortMap.has(target.pluginId)) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reasonCode: 'cross_plugin_bridge_missing',
        sourcePluginId: source.pluginId,
        sourceRole: source.role,
        targetPluginId: target.pluginId,
        targetRole: target.role,
      };
    });
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      runtimeCapabilities: {
        plugins: {
          'dvt.warehouse-source': { available: false, reason: 'source import disabled in test' },
        },
      },
      canonicalNodes: [
        {
          id: 'warehouse-source',
          name: 'warehouse-source',
          pluginId: 'dvt.warehouse-source',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: [],
        },
        {
          id: 'dbt-model',
          name: 'dbt-model',
          pluginId: 'dbt',
          kind: 'dbt:model',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      nodes: [
        {
          id: 'warehouse-source',
          data: {
            name: 'warehouse-source',
            pluginKind: 'dvt:source',
            role: 'input',
            status: 'idle',
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'dbt-model',
          data: {
            name: 'dbt-model',
            pluginKind: 'dbt:model',
            role: 'transform',
            status: 'idle',
          },
          position: { x: 220, y: 0 },
        },
      ],
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'warehouse-source',
        sourceHandle: null,
        target: 'dbt-model',
        targetHandle: null,
      });
    });

    expect(toastState.error).not.toHaveBeenCalled();
    expect(harness.latest()?.confirmEdgeModal).toEqual({
      open: true,
      edge: {
        source: 'warehouse-source',
        target: 'dbt-model',
        type: 'lineage',
      },
    });

    harness.cleanup();
  });

  it('confirms warehouse-source to dbt model edges into draft visible-edge truth', async () => {
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setEdges,
      setDraftSession,
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: ['warehouse-source', 'dbt-model'],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      },
      runtimeCapabilities: {
        plugins: {
          'dvt.warehouse-source': { available: false, reason: 'source import disabled in test' },
        },
      },
      canonicalNodes: [
        {
          id: 'warehouse-source',
          name: 'warehouse-source',
          pluginId: 'dvt.warehouse-source',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: [],
        },
        {
          id: 'dbt-model',
          name: 'dbt-model',
          pluginId: 'dbt',
          kind: 'dbt:model',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      nodes: [
        {
          id: 'warehouse-source',
          data: {
            name: 'warehouse-source',
            pluginKind: 'dvt:source',
            role: 'input',
            status: 'idle',
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'dbt-model',
          data: {
            name: 'dbt-model',
            pluginKind: 'dbt:model',
            role: 'transform',
            status: 'idle',
          },
          position: { x: 220, y: 0 },
        },
      ],
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'warehouse-source',
        sourceHandle: null,
        target: 'dbt-model',
        targetHandle: null,
      });
      harness.latest()?.confirmEdgeCreation();
    });

    expect(setEdges).toHaveBeenCalledTimes(1);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const updateDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof updateDraftSession).toBe('function');
    const nextDraftSession = updateDraftSession({
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: ['warehouse-source', 'dbt-model'],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    });
    expect(nextDraftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'warehouse-source', targetId: 'dbt-model' },
    ]);

    harness.cleanup();
  });

  it('confirms the registered HTTP JSON to object-file bridge through the real admission rail', async () => {
    await useRealConnectionAdmissionRail();
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [HTTP_JSON_ACQUISITION_NODE.id, OBJECT_FILE_LOAD_NODE.id],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setEdges,
      setDraftSession,
      draftSession,
      runtimeCapabilities: HETEROGENEOUS_BRIDGE_CAPABILITIES,
      canonicalNodes: [HTTP_JSON_ACQUISITION_NODE, OBJECT_FILE_LOAD_NODE],
      nodes: buildHeterogeneousBridgeFlowNodes(),
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: HTTP_JSON_ACQUISITION_NODE.id,
        sourceHandle: null,
        target: OBJECT_FILE_LOAD_NODE.id,
        targetHandle: null,
      });
    });

    expect(toastState.error).not.toHaveBeenCalled();
    expect(harness.latest()?.confirmEdgeModal).toEqual({
      open: true,
      edge: {
        source: HTTP_JSON_ACQUISITION_NODE.name,
        target: OBJECT_FILE_LOAD_NODE.name,
        type: 'lineage',
      },
    });

    act(() => {
      harness.latest()?.confirmEdgeCreation();
    });

    expect(setEdges).toHaveBeenCalledTimes(1);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const updateDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof updateDraftSession).toBe('function');
    expect(updateDraftSession(draftSession).workingSet.visibleEdges).toEqual([
      { sourceId: HTTP_JSON_ACQUISITION_NODE.id, targetId: OBJECT_FILE_LOAD_NODE.id },
    ]);

    harness.cleanup();
  });

  it('rejects the inverse object-file to HTTP JSON bridge without mutating graph truth', async () => {
    await useRealConnectionAdmissionRail();
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setEdges,
      setDraftSession,
      runtimeCapabilities: HETEROGENEOUS_BRIDGE_CAPABILITIES,
      canonicalNodes: [HTTP_JSON_ACQUISITION_NODE, OBJECT_FILE_LOAD_NODE],
      nodes: buildHeterogeneousBridgeFlowNodes(),
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: OBJECT_FILE_LOAD_NODE.id,
        sourceHandle: null,
        target: HTTP_JSON_ACQUISITION_NODE.id,
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledTimes(1);
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });
    expect(setEdges).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('formats plugin-rule rejections at the adapter boundary', async () => {
    rejectGraphHandlerConnectionWith({
      allowed: false,
      reasonCode: 'plugin_rule_blocked',
      reason: 'Connection not permitted by DVT authoring rules',
    });
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [
        buildCanonicalNode('source-node', 'input'),
        buildCanonicalNode('sink-node', 'output'),
      ],
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledWith(
      'Connection not permitted by DVT authoring rules'
    );
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

    harness.cleanup();
  });

  it('applies card column commands through ConfigureCanvasDvtNode into the draft session', async () => {
    const { applyDvtSubstraitSemanticDocument } = await vi.importActual<
      typeof import('./canvasDvtTransformAuthoringAuthority')
    >('./canvasDvtTransformAuthoringAuthority');
    const {
      createDvtSubstraitProjectionDraft,
      decodeDvtSubstraitProjectionDocument,
      encodeDvtSubstraitProjectionDocument,
      inspectDvtSubstraitProjectionDraft,
      resolveDvtSubstraitColumnFunctions,
    } = await vi.importActual<typeof import('./canvasDvtSubstraitProjection')>(
      './canvasDvtSubstraitProjection'
    );
    const source = {
      ...buildCanonicalNode('source-orders', 'input'),
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.orders',
        } as const,
        columns: [
          { name: 'order_id', type: 'integer' },
          { name: 'customer', type: 'text' },
          { name: 'amount', type: 'numeric' },
        ],
      },
    } satisfies CanonicalNode;
    const projection = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: source.id,
        schema: 'raw',
        table: 'orders',
        sourceRef: source.metadata.connectedSourceRef,
        fields: source.metadata.columns.map((column) => ({
          name: column.name,
          dataType: column.type,
        })),
      },
      targetNodeId: 'transform-orders',
      outputs: source.metadata.columns.map((column) => ({
        fieldId: `output:${column.name}`,
        name: column.name,
        sourceFieldName: column.name,
      })),
    });
    const transform = applyDvtSubstraitSemanticDocument(
      buildCanonicalNode('transform-orders', 'transform'),
      encodeDvtSubstraitProjectionDocument(projection)
    );
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [source.id, transform.id],
        visibleEdges: [{ sourceId: source.id, targetId: transform.id }],
        pendingExplicitNodeIds: [],
      },
      localNodeCatalog: { [source.id]: source, [transform.id]: transform },
    };
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, transform],
      edges: [
        {
          id: 'source-orders->transform-orders',
          source: source.id,
          target: transform.id,
        },
      ],
      draftSession,
      setDraftSession,
    });
    await harness.render();
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((item) => item.name === 'trim');
    if (trim == null) throw new Error('Expected admitted trim capability.');

    act(() => {
      harness.latest()?.handleApplyDvtSubstraitColumnFunction({
        nodeId: transform.id,
        columnId: 'output:order_id',
        sourceColumnId: 'output:customer',
        capabilityId: trim.capabilityId,
      });
    });

    expect(setDraftSession).toHaveBeenCalledOnce();
    const updateDraftSession = setDraftSession.mock.calls[0]?.[0] as (
      current: typeof draftSession
    ) => typeof draftSession;
    const nextSession = updateDraftSession(draftSession);
    const nextNode = nextSession.localNodeCatalog?.[transform.id];
    if (nextNode == null) throw new Error('Expected updated transform.');
    const authority = readDvtTransformAuthoringAuthority(nextNode);
    if (authority.mode !== 'substrait') throw new Error('Expected Substrait authority.');
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );

    expect(inspection.ok).toBe(true);
    expect(
      inspection.ok
        ? inspection.projection.outputs.find((output) => output.fieldId === 'output:order_id')
        : []
    ).toMatchObject({
      fieldId: 'output:order_id',
      sourceFieldName: 'customer',
      operations: ['trim'],
    });

    setDraftSession.mockClear();
    act(() => {
      harness.latest()?.handleToggleCanvasColumnOutput({
        nodeId: transform.id,
        columnId: 'output:customer',
        columnType: 'text',
        output: false,
      });
    });
    expect(setDraftSession).toHaveBeenCalledOnce();
    const toggledSession = setDraftSession.mock.calls[0]?.[0] as typeof draftSession;
    const toggledNode = toggledSession.localNodeCatalog?.[transform.id];
    if (toggledNode == null) throw new Error('Expected updated transform output selection.');
    const toggledAuthority = readDvtTransformAuthoringAuthority(toggledNode);
    if (toggledAuthority.mode !== 'substrait') throw new Error('Expected Substrait authority.');
    const toggledInspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(toggledAuthority.semanticDocument)
    );
    expect(
      toggledInspection.ok
        ? toggledInspection.projection.outputs.map((output) => output.fieldId)
        : []
    ).toEqual(['output:order_id', 'output:amount']);

    setDraftSession.mockClear();
    act(() => {
      harness.latest()?.handleReorderDvtSubstraitColumnOutput({
        nodeId: transform.id,
        columnId: 'output:amount',
        targetColumnId: 'output:order_id',
        placement: 'before',
      });
    });
    const reorderedSession = setDraftSession.mock.calls[0]?.[0] as typeof draftSession;
    const reorderedNode = reorderedSession.localNodeCatalog?.[transform.id];
    if (reorderedNode == null) throw new Error('Expected reordered transform outputs.');
    const reorderedAuthority = readDvtTransformAuthoringAuthority(reorderedNode);
    if (reorderedAuthority.mode !== 'substrait') throw new Error('Expected Substrait authority.');
    const reorderedInspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(reorderedAuthority.semanticDocument)
    );
    expect(
      reorderedInspection.ok
        ? reorderedInspection.projection.outputs.map((output) => output.fieldId)
        : []
    ).toEqual(['output:amount', 'output:order_id', 'output:customer']);

    harness.cleanup();
  });
});
