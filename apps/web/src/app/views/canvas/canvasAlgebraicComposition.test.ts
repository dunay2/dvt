import type { Edge } from '@xyflow/react';
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasAlgebraicCompositionOperations,
  resolveCanvasAlgebraicCompositionTransaction,
} from './canvasAlgebraicComposition';
import type { CanvasDraftSession } from './canvasDraftSession';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllDraft,
} from './canvasDvtSubstraitSetComposition';

const FIELDS = ['customer_id', 'name', 'country'] as const;

function source(id: string): CanonicalNode {
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
      columns: FIELDS.map((name) => ({ name, type: 'string' })),
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
    id: 'all-customers',
    name: 'All customers',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}

describe('Canvas algebraic composition', () => {
  it('adds the second dependency and persists one canonical UNION ALL', () => {
    const north = source('customers-north');
    const south = source('customers-south');
    const target = transform();
    const visibleEdges = [{ sourceId: north.id, targetId: target.id }];
    const draftSession: CanvasDraftSession = {
      syncState: 'editing',
      baseline: { record: null },
      draftRevision: 'rev-1',
      workingSet: {
        visibleNodeIds: [north.id, south.id, target.id],
        visibleEdges,
        pendingExplicitNodeIds: [],
      },
    };
    const edges: Edge[] = [{ id: 'north-target', source: north.id, target: target.id }];
    const state = {
      canonicalNodesById: new Map([
        [north.id, north],
        [south.id, south],
        [target.id, target],
      ]),
      draftSession,
      edges,
      pluginPortMap: getPluginPortMap(),
      sourceNodeId: south.id,
      targetNodeId: target.id,
    };

    expect(resolveCanvasAlgebraicCompositionOperations(state)).toEqual(['union_all']);
    const transaction = resolveCanvasAlgebraicCompositionTransaction({
      ...state,
      operation: 'union_all',
    });
    if (transaction.outcome !== 'confirmed') throw new Error('Expected confirmed composition.');
    const composedNode = transaction.draftSession.localNodeCatalog?.[target.id];
    if (composedNode == null) throw new Error('Expected composed Transform.');
    const authority = readDvtTransformAuthoringAuthority(composedNode);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      throw new Error('Expected Substrait authority.');
    }
    const inspection = inspectDvtSubstraitUnionAllDraft(
      decodeDvtSubstraitUnionAllDocument(authority.semanticDocument)
    );
    expect(
      inspection.ok
        ? {
            inputs: inspection.projection.inputs.map((input) => input.table),
            outputs: inspection.projection.outputs.map((output) => output.name),
            edges: transaction.draftSession.workingSet.visibleEdges,
          }
        : null
    ).toEqual({
      inputs: [north.id, south.id],
      outputs: [...FIELDS],
      edges: [...visibleEdges, { sourceId: south.id, targetId: target.id }],
    });
  });

  it('does not replace an authored Transform when another card is dropped on it', () => {
    const north = source('customers-north');
    const south = source('customers-south');
    const target = {
      ...transform(),
      metadata: { sql: 'select customer_id from raw.customers_north' },
    };
    const visibleEdges = [{ sourceId: north.id, targetId: target.id }];
    const draftSession: CanvasDraftSession = {
      syncState: 'editing',
      baseline: { record: null },
      draftRevision: 'rev-1',
      workingSet: {
        visibleNodeIds: [north.id, south.id, target.id],
        visibleEdges,
        pendingExplicitNodeIds: [],
      },
    };
    const state = {
      canonicalNodesById: new Map([
        [north.id, north],
        [south.id, south],
        [target.id, target],
      ]),
      draftSession,
      edges: [{ id: 'north-target', source: north.id, target: target.id }],
      pluginPortMap: getPluginPortMap(),
      sourceNodeId: south.id,
      targetNodeId: target.id,
    };

    expect(resolveCanvasAlgebraicCompositionOperations(state)).toEqual([]);
    expect(
      resolveCanvasAlgebraicCompositionTransaction({ ...state, operation: 'union_all' })
    ).toEqual({ outcome: 'noop', rejection: { code: 'operation_not_available' } });
    expect(draftSession.workingSet.visibleEdges).toEqual(visibleEdges);
  });
});
