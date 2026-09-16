import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  appendDvtSubstraitInnerJoinInput,
  createDvtSubstraitStringInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitUnionAllDraft,
  encodeDvtSubstraitUnionAllDocument,
} from './canvasDvtSubstraitSetComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';
import { projectCanvasViewportEdges } from './canvasViewportEdgeProjection';

function source(id: string): CanonicalNode {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: `raw.${id}`,
  };
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
      connectedSourceRef: sourceRef,
      columns: [{ name: 'id', type: 'text' }],
    },
  };
}

function transform(id = 'model'): CanonicalNode {
  return {
    id,
    name: 'Model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

function sourceRef(node: CanonicalNode): ConnectedSourceRef {
  return node.metadata!.connectedSourceRef as ConnectedSourceRef;
}

function joinInput(node: CanonicalNode) {
  return {
    source: {
      nodeId: node.id,
      schema: 'raw',
      table: node.name,
      sourceRef: sourceRef(node),
    },
    fields: ['id'],
    fieldTypes: ['string' as const],
  };
}

function initialJoin(left: CanonicalNode, right: CanonicalNode) {
  return createDvtSubstraitStringInnerJoinDraft({
    left: joinInput(left),
    right: joinInput(right),
    leftFieldName: 'id',
    rightFieldName: 'id',
    targetNodeId: 'model',
  });
}

function canonicalJoin(left: CanonicalNode, right: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitInnerJoinDocument(initialJoin(left, right))
  );
}

function canonicalUnionAll(left: CanonicalNode, right: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitUnionAllDocument(
      createDvtSubstraitUnionAllDraft({
        inputs: [left, right].map((node) => ({
          nodeId: node.id,
          schema: 'raw',
          table: node.name,
          fields: [{ name: 'id', type: 'string' as const }],
          sourceRef: sourceRef(node),
        })),
        targetNodeId: 'model',
      })
    )
  );
}

function canonicalThreeInputJoin(
  left: CanonicalNode,
  right: CanonicalNode,
  third: CanonicalNode
): CanonicalNode {
  const initial = initialJoin(left, right);
  const inspection = inspectDvtSubstraitNInputJoinDraft(initial);
  if (!inspection.ok) throw new Error('Expected initial JOIN inspection.');
  const leftSourceFieldId = inspection.projection.outputs[0]?.source.fieldId;
  if (leftSourceFieldId == null) throw new Error('Expected initial JOIN output.');
  const appended = appendDvtSubstraitInnerJoinInput(initial, {
    source: {
      nodeId: third.id,
      schema: 'raw',
      table: third.name,
      sourceRef: sourceRef(third),
    },
    fields: ['id', 'detail'],
    predicate: { leftSourceFieldId, rightFieldName: 'id' },
    selectedFields: ['detail'],
  });
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitInnerJoinDocument(appended)
  );
}

function canonicalAccessibleLabel(
  model: CanonicalNode,
  sources: readonly CanonicalNode[],
  locale: string
): string | undefined {
  const visibleEdges = sources.map((input) => ({ sourceId: input.id, targetId: model.id }));
  const projected = projectCanvasViewportEdges({
    visibleEdges,
    allowedNodeIds: new Set([...sources.map((input) => input.id), model.id]),
    canonicalEdgeIdBySignature: new Map(),
    canonicalEdgeBySignature: new Map(),
    canonicalNodesById: new Map([...sources, model].map((node) => [node.id, node])),
    locale,
  });
  const composition = readCanvasDependencyEdgeData(projected[0]?.data)?.composition as
    { accessibleLabel?: string } | undefined;
  return composition?.accessibleLabel;
}

describe('Canvas viewport edge projection', () => {
  it('correlates two pending inputs while preserving two real dependency edges', () => {
    const orders = source('orders');
    const clients = source('clients');
    const model = transform();
    const visibleEdges = [
      { sourceId: orders.id, targetId: model.id },
      { sourceId: clients.id, targetId: model.id },
    ];

    const projected = projectCanvasViewportEdges({
      visibleEdges,
      allowedNodeIds: new Set([orders.id, clients.id, model.id]),
      canonicalEdgeIdBySignature: new Map(),
      canonicalEdgeBySignature: new Map(),
      canonicalNodesById: new Map([orders, clients, model].map((node) => [node.id, node])),
      locale: 'es',
    });
    const composition = projected.map(
      (edge) => readCanvasDependencyEdgeData(edge.data)?.composition
    );

    expect(projected).toHaveLength(2);
    expect(composition.every((member) => member?.state === 'pending')).toBe(true);
    expect(composition.every((member) => member?.label === 'RELACIONAR / COMPONER')).toBe(true);
    expect(composition.filter((member) => member?.role === 'trunk-owner')).toHaveLength(1);
    expect(projected.every((edge) => edge.ariaLabel?.includes('RELACIONAR / COMPONER'))).toBe(true);
  });

  it('projects concise canonical JOIN and UNION ALL facts into the accessible badge name', () => {
    const orders = source('orders');
    const clients = source('clients');
    const details = source('details');

    expect(canonicalAccessibleLabel(canonicalJoin(orders, clients), [orders, clients], 'es')).toBe(
      'INNER JOIN, entradas: 2, predicados: 1'
    );
    expect(
      canonicalAccessibleLabel(canonicalUnionAll(orders, clients), [orders, clients], 'en')
    ).toBe('UNION ALL, inputs: 2, outputs: 1, bag semantics');
    expect(
      canonicalAccessibleLabel(
        canonicalThreeInputJoin(orders, clients, details),
        [orders, clients, details],
        'en'
      )
    ).toBe('INNER JOIN, inputs: 3, predicates: 2');
  });
});
