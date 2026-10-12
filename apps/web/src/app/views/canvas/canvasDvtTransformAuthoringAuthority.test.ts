import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanonicalNodeToAuthoringNode } from './canvasDraftAuthoring';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { projectionScenario } from './canvasProjectionScenario.test-support';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';

function buildTransformNode(metadata: CanonicalNode['metadata'] = {}): CanonicalNode {
  return {
    id: 'transform-orders',
    name: 'Orders model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

function buildSourceNode(metadata: CanonicalNode['metadata'] = {}): CanonicalNode {
  return {
    id: 'source-orders',
    name: 'Orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'success',
    tags: ['source'],
    metadata: {
      schema: 'raw',
      tableName: 'orders',
      ...metadata,
    },
  };
}

function buildSemanticDocument(): ReturnType<typeof encodeDvtSubstraitSemanticDocument> {
  return encodeDvtSubstraitSemanticDocument(
    projectionScenario({
      sourceNodeId: 'source-orders',
      targetNodeId: 'transform-orders',
    })
  );
}

describe('DVT transform authoring authority', () => {
  it('persists an explicitly cleared model without changing its identity or disposition', () => {
    const node = applyDvtSubstraitSemanticDocument(
      buildTransformNode({ config: { owner: 'finance', materialized: 'table' } }),
      buildSemanticDocument()
    );
    const cleared = applyDvtTransformAuthoringMetadata(node, {
      kind: 'transform',
      mode: 'uninitialized',
      materialized: 'table',
    });
    expect(readDvtTransformAuthoringAuthority(node)).not.toBeNull();
    expect(readDvtTransformAuthoringAuthority(cleared)).toBeNull();
    const draft = WorkspaceGraphAuthoringDraftSchema.parse({
      canvas: { id: 'canvas-1', kind: 'transformation', title: 'Transformation' },
      nodeIds: [cleared.id],
      nodePositions: { [cleared.id]: { x: 40, y: 80 } },
      nodes: [projectCanonicalNodeToAuthoringNode(cleared)],
      edges: [],
    });
    const reopened = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft).canonicalNodes[0]!;
    expect(reopened.id).toBe(node.id);
    expect(reopened.name).toBe(node.name);
    expect(reopened.metadata?.config).toEqual(node.metadata?.config);
    expect(createDvtTransformAuthoringMetadata(reopened)).toEqual({
      kind: 'transform',
      mode: 'uninitialized',
      materialized: 'table',
    });
  });
  it('represents a new Transform as uninitialized instead of inventing SQL authority', () => {
    expect(readDvtTransformAuthoringAuthority(buildTransformNode())).toBeNull();
  });

  it.each([
    { sql: 'select order_id from raw.orders' },
    { config: { sql: 'select order_id from raw.orders' } },
    { transformAuthoring: { version: 'v1', mode: 'sql' } },
    {
      transformAuthoring: {
        version: 'v1',
        mode: 'visual',
        recipe: { version: 'v1', outputs: [], filters: [] },
      },
    },
  ])('fails closed for removed SQL/VTX1 metadata %#', (metadata) => {
    expect(() => readDvtTransformAuthoringAuthority(buildTransformNode(metadata))).toThrow(
      'DVT transform authoring authority metadata is unsupported.'
    );
  });

  it('persists canonical Substrait authority and column metadata through the Graph Draft roundtrip', () => {
    const semanticDocument = buildSemanticDocument();
    const canonicalNode = applyDvtSubstraitSemanticDocument(
      buildTransformNode({
        sql: 'select stale from raw.orders',
        compiledSql: 'select stale from raw.orders',
        config: { sql: 'select stale from raw.orders', selectedColumns: ['order_id'] },
        columns: [{ name: 'order_id', type: 'integer' }],
        transformLineageProvenance: { stale: true },
      }),
      semanticDocument
    );

    expect(canonicalNode.metadata).toEqual({
      config: { selectedColumns: ['order_id'] },
      columns: [{ name: 'order_id', type: 'integer' }],
      transformAuthoring: {
        version: 'v1',
        mode: 'substrait',
        semanticDocument,
      },
    });

    const draft = WorkspaceGraphAuthoringDraftSchema.parse({
      canvas: { id: 'canvas-1', kind: 'transformation', title: 'Transformation' },
      nodeIds: [canonicalNode.id],
      nodePositions: { [canonicalNode.id]: { x: 40, y: 80 } },
      nodes: [projectCanonicalNodeToAuthoringNode(canonicalNode)],
      edges: [],
    });
    const reopenedNode = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft).canonicalNodes[0];

    expect(readDvtTransformAuthoringAuthority(reopenedNode!)).toEqual({
      version: 'v1',
      mode: 'substrait',
      semanticDocument,
    });
  });

  it('persists canonical semantics on a Source without changing its physical identity', () => {
    const semanticDocument = buildSemanticDocument();
    const source = applyDvtSubstraitSemanticDocument(
      buildSourceNode({ columns: [{ name: 'order_id', type: 'integer' }] }),
      semanticDocument
    );

    expect(source).toMatchObject({
      id: 'source-orders',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        columns: [{ name: 'order_id', type: 'integer' }],
      },
    });
    expect(readDvtTransformAuthoringAuthority(source)?.semanticDocument).toEqual(semanticDocument);
  });

  it('rejects non-semantic nodes and malformed canonical metadata', () => {
    expect(() =>
      readDvtTransformAuthoringAuthority({ ...buildTransformNode(), kind: 'dvt:sink' })
    ).toThrow('DVT semantic authoring authority requires a DVT Source or Transform node.');
    expect(() =>
      readDvtTransformAuthoringAuthority(
        buildTransformNode({ transformAuthoring: { version: 'v1', mode: 'substrait' } })
      )
    ).toThrow('DVT transform authoring authority metadata is invalid.');
  });
});
