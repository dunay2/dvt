import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { applyCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';

function source(id: string, type = 'text'): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'raw',
      tableName: id,
      columns: [{ name: 'client_id', type }],
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: `raw.${id}`,
      },
    },
  };
}

function transform(): CanonicalNode {
  return {
    id: 'model',
    name: 'Model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: { columns: [{ name: 'client_id', type: 'text' }] },
  };
}

function session(
  nodes: readonly CanonicalNode[],
  includeRightDependency = true
): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      visibleEdges: [
        { sourceId: 'orders', targetId: 'model' },
        ...(includeRightDependency ? [{ sourceId: 'clients', targetId: 'model' }] : []),
      ],
      pendingExplicitNodeIds: [],
    },
    draftRevision: null,
    localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function mappedFixture(rightType = 'text', includeRightDependency = true) {
  const orders = source('orders');
  const clients = source('clients', rightType);
  const model = transform();
  const initial = session([orders, clients, model], includeRightDependency);
  const mapped = applyCanvasColumnMapping({
    draftSession: initial,
    canonicalNodesById: new Map([orders, clients, model].map((node) => [node.id, node])),
    source: { nodeId: orders.id, columnId: 'client_id' },
    target: { nodeId: model.id, columnName: 'client_id' },
  });
  if (mapped.outcome !== 'applied') throw new Error('Expected initial projection mapping.');
  const mappedModel = mapped.draftSession.localNodeCatalog?.[model.id];
  const authority = mappedModel == null ? null : readDvtTransformAuthoringAuthority(mappedModel);
  if (authority?.mode !== 'substrait') throw new Error('Expected Substrait projection authority.');
  const inspection = inspectDvtSubstraitProjectionDraft(
    decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
  );
  if (!inspection.ok) throw new Error('Expected inspectable projection.');
  return {
    draftSession: mapped.draftSession,
    canonicalNodesById: new Map([orders, clients, model].map((node) => [node.id, node])),
    outputId: inspection.projection.outputs[0]!.fieldId,
  };
}

describe('resolveCanvasRelationalPredicateSeed', () => {
  it('captures oriented operands without mutating the canonical draft', () => {
    const fixture = mappedFixture();
    const before = fixture.draftSession;

    expect(
      resolveCanvasRelationalPredicateSeed({
        ...fixture,
        source: { nodeId: 'clients', columnId: 'client_id' },
        target: { nodeId: 'model', outputId: fixture.outputId, columnName: 'client_id' },
      })
    ).toEqual({
      targetNodeId: 'model',
      left: {
        nodeId: 'orders',
        fieldId: 'client_id',
        fieldName: 'client_id',
        dataType: 'string',
      },
      right: {
        nodeId: 'clients',
        fieldId: 'client_id',
        fieldName: 'client_id',
        dataType: 'string',
      },
      candidateOperator: 'equal',
    });
    expect(fixture.draftSession).toBe(before);
  });

  it('does not reinterpret a same-input mapping as a relation', () => {
    const fixture = mappedFixture();
    expect(
      resolveCanvasRelationalPredicateSeed({
        ...fixture,
        source: { nodeId: 'orders', columnId: 'client_id' },
        target: { nodeId: 'model', outputId: fixture.outputId, columnName: 'client_id' },
      })
    ).toBeNull();
  });

  it('fails closed when the second dependency or admitted operand type is missing', () => {
    for (const fixture of [mappedFixture('integer'), mappedFixture('text', false)]) {
      expect(
        resolveCanvasRelationalPredicateSeed({
          ...fixture,
          source: { nodeId: 'clients', columnId: 'client_id' },
          target: { nodeId: 'model', outputId: fixture.outputId, columnName: 'client_id' },
        })
      ).toBeNull();
    }
  });
});
