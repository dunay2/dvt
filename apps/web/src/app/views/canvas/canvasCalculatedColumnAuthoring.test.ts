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
  type DvtSubstraitProjectionSemantics,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function inspect(node: CanonicalNode): DvtSubstraitProjectionSemantics {
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
  it('rejects calculated output authoring on Source without mutating physical identity', () => {
    const initial = session(source);
    const result = applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([[source.id, source]]),
      request: { nodeId: source.id, kind: 'string-literal', alias: 'channel', value: 'web' },
    });

    expect(result).toEqual({ outcome: 'rejected' });
    expect(initial.localNodeCatalog?.[source.id]).toBe(source);
    expect(source.metadata).not.toHaveProperty('transformAuthoring');
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
    const created = inspect(replacement).outputs.at(-1);
    expect(created).toMatchObject({
      name: 'customer_clean',
      sourceFieldName: 'customer',
      operations: ['trim'],
    });
    expect(created?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(created?.fieldId).not.toContain('customer_clean');
  });

  it('keeps duplicate-alias validation on Transform after removing Source authoring', () => {
    const transform = projectionTransform();
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });

    const result = applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: { nodeId: transform.id, kind: 'string-literal', alias: 'customer', value: 'x' },
    });

    expect(result).toEqual({ outcome: 'rejected' });
    expect(initial.localNodeCatalog?.[transform.id]).toBe(transform);
  });

  it('rejects timestamp and row-number calculated fields on Source', () => {
    const initial = session(source);
    const timestamp = applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: source.id,
        kind: 'timestamp-literal',
        alias: 'loaded_at',
        value: '2026-09-02T12:30:00Z',
      },
    });
    const rowNumber = applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: source.id,
        kind: 'row-number',
        alias: 'row_id',
        orderFieldId: 'order_id',
      },
    });

    expect(timestamp).toEqual({ outcome: 'rejected' });
    expect(rowNumber).toEqual({ outcome: 'rejected' });
    expect(initial.localNodeCatalog?.[source.id]).toBe(source);
  });
});
