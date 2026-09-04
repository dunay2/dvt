import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanonicalNodeToAuthoringNode } from './canvasDraftAuthoring';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitPilotDraft,
  encodeDvtSubstraitPilotDocument,
} from './canvasDvtSubstraitPilot';

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

function buildSemanticDocument(): ReturnType<typeof encodeDvtSubstraitPilotDocument> {
  return encodeDvtSubstraitPilotDocument(
    createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-orders',
      targetNodeId: 'transform-orders',
    })
  );
}

describe('DVT transform authoring authority', () => {
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

  it('persists only canonical Substrait metadata and survives the Graph Draft roundtrip', () => {
    const semanticDocument = buildSemanticDocument();
    const canonicalNode = applyDvtSubstraitSemanticDocument(
      buildTransformNode({
        sql: 'select stale from raw.orders',
        compiledSql: 'select stale from raw.orders',
        config: { sql: 'select stale from raw.orders', selectedColumns: ['order_id'] },
        transformLineageProvenance: { stale: true },
      }),
      semanticDocument
    );

    expect(canonicalNode.metadata).toEqual({
      config: { selectedColumns: ['order_id'] },
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
    const source = applyDvtSubstraitSemanticDocument(buildSourceNode(), semanticDocument);

    expect(source).toMatchObject({
      id: 'source-orders',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      metadata: { schema: 'raw', tableName: 'orders' },
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
