import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasCalculatedColumn } from './canvasCalculatedColumnAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjection,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
const source: CanonicalNode = {
  id: 'orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: ['source', 'raw'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    },
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};
function session(...nodes: CanonicalNode[]): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      visibleEdges: [],
      pendingExplicitNodeIds: [],
    },
    draftRevision: null,
    localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function inspect(node: CanonicalNode): DvtSubstraitProjection {
  const authority = readDvtTransformAuthoringAuthority(node)!;
  if (authority.mode !== 'substrait') throw new Error('Expected Substrait authority.');
  const inspection = inspectDvtSubstraitProjectionDraft(
    decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
  );
  if (!inspection.ok) throw new Error('Expected an inspectable projection.');
  return inspection.projection;
}

function projectionTransform(): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef: source.metadata?.connectedSourceRef as never,
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
    ],
  });
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Transform orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
}

describe('Canvas calculated column authoring', () => {
  it('appends a string literal projection without changing the Source identity', () => {
    const result = applyCanvasCalculatedColumn({
      draftSession: session(source),
      canonicalNodesById: new Map([[source.id, source]]),
      request: { nodeId: source.id, kind: 'string-literal', alias: 'channel', value: 'web' },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[source.id];
    expect(replacement).toMatchObject({
      id: source.id,
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      metadata: { schema: 'raw', tableName: 'orders' },
    });
    if (replacement == null) throw new Error('Expected an updated Source.');
    expect(inspect(replacement).outputs).toMatchObject([
      { name: 'order_id', sourceFieldName: 'order_id' },
      { name: 'customer', sourceFieldName: 'customer' },
      { name: 'channel', calculation: { kind: 'string-literal', value: 'web' } },
    ]);
    expect(replacement.metadata?.columns).toEqual(source.metadata?.columns);
  });
  it('appends an admitted scalar function to an existing projection Transform', () => {
    const transform = projectionTransform();
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });

    const result = applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: {
        nodeId: transform.id,
        kind: 'scalar-function',
        alias: 'customer_clean',
        inputFieldId: 'output:customer',
        capabilityId: trim.capabilityId,
      },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[transform.id];
    if (replacement == null) throw new Error('Expected an updated Transform.');
    expect(inspect(replacement).outputs.at(-1)).toMatchObject({
      name: 'customer_clean',
      sourceFieldName: 'customer',
      operations: ['trim'],
    });
  });
  it('rejects a duplicate alias without changing the draft', () => {
    const initial = session(source);
    const result = applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([[source.id, source]]),
      request: { nodeId: source.id, kind: 'string-literal', alias: 'customer', value: 'x' },
    });
    expect(result).toEqual({ outcome: 'rejected' });
    expect(initial.localNodeCatalog?.[source.id]).toBe(source);
  });
  it('continues authoring timestamp and ordered row-number fields on the Source', () => {
    const promoted = applyCanvasCalculatedColumn({
      draftSession: session(source),
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: source.id,
        kind: 'timestamp-literal',
        alias: 'loaded_at',
        value: '2026-09-02T12:30:00Z',
      },
    });
    if (promoted.outcome !== 'applied') throw new Error('Expected Source authoring.');
    const rowNumbered = applyCanvasCalculatedColumn({
      draftSession: promoted.draftSession,
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: source.id,
        kind: 'row-number',
        alias: 'row_id',
        orderFieldId: 'order_id',
      },
    });
    expect(rowNumbered.outcome).toBe('applied');
    if (rowNumbered.outcome !== 'applied') return;
    const replacement = rowNumbered.draftSession.localNodeCatalog?.[source.id];
    if (replacement == null) throw new Error('Expected updated Source.');
    expect(inspect(replacement).outputs.slice(-2)).toMatchObject([
      {
        name: 'loaded_at',
        calculation: { kind: 'timestamp-literal', value: '2026-09-02T12:30:00.000Z' },
      },
      { name: 'row_id', calculation: { kind: 'row-number', orderSourceOrdinal: 0 } },
    ]);
  });
});
