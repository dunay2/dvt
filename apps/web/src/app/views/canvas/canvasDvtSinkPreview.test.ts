import { describe, expect, it } from 'vitest';
import { DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import documents from '../../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';

function fixture(): Parameters<typeof buildProtectedDvtPreviewProjection>[0] {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents.two);
  const sources = document.sidecar.relations
    .filter((relation) => relation.sourceRef !== undefined)
    .map((relation) => ({
      ...buildJoinWarehouseSourceNode({
        id: relation.relationId,
        table: relation.displayName!,
        columns: [],
      }),
      metadata: {
        connectedSourceRef: relation.sourceRef,
        schema: 'raw',
        tableName: relation.displayName,
      },
    }));
  const transform = applyDvtSubstraitSemanticDocument(
    buildDvtNode('dvt:transform', { config: { materialized: 'ephemeral' } }),
    document
  );
  const sink = buildDvtNode('dvt:sink', { config: { schema: 'analytics', table: 'orders' } });
  return {
    canvasId: 'canvas',
    canonicalNodes: [...sources, transform, sink],
    workspaceNodeIds: [],
    canonicalEdges: [
      ...sources.map((source) => ({
        id: source.id,
        sourceId: source.id,
        targetId: transform.id,
        relation: 'lineage' as const,
      })),
      { id: 'publication', sourceId: transform.id, targetId: sink.id, relation: 'lineage' },
    ],
    selectionIntent: { mode: 'explicit', nodeIds: [sink.id] },
  };
}

describe('Protected explicit Sink Preview intent', () => {
  it('selects the Sink with its full semantic closure and invalidates on destination edits', () => {
    const input = fixture();
    const result = buildProtectedDvtPreviewProjection(input);
    expect(result).toMatchObject({
      ok: true,
      selection: { mode: 'upstream', nodeIds: ['dvt-sink'] },
      requestedRootNodeIds: ['dvt-sink'],
      derivedDependencyNodeIds: expect.arrayContaining(['dvt-transform']),
    });
    if (!result.ok) throw new Error(result.cause);
    expect(result.scopedNodeIds).toEqual(input.canonicalNodes.map((node) => node.id).sort());
    expect(
      buildProtectedDvtPreviewProjection({
        ...input,
        canonicalEdges: [...input.canonicalEdges].reverse(),
      })
    ).toEqual(result);
    const updated = buildProtectedDvtPreviewProjection({
      ...input,
      canonicalNodes: input.canonicalNodes.map((node) =>
        node.kind !== 'dvt:sink'
          ? node
          : { ...node, metadata: { config: { schema: 'analytics', table: 'another' } } }
      ),
    });
    expect(updated.ok && updated.draftSignature).not.toBe(result.draftSignature);
  });
  it.each(['missing input', 'extra input', 'multiple sinks'] as const)(
    'rejects %s rather than shrinking the closure',
    (scenario) => {
      const input = fixture();
      const edges =
        scenario === 'missing input'
          ? input.canonicalEdges.slice(0, -1)
          : [...input.canonicalEdges];
      if (scenario === 'extra input')
        edges.push({ ...input.canonicalEdges[0]!, id: 'extra', targetId: 'dvt-sink' });
      const nodes =
        scenario === 'multiple sinks'
          ? [...input.canonicalNodes, { ...input.canonicalNodes.at(-1)!, id: 'second-sink' }]
          : input.canonicalNodes;
      if (scenario === 'multiple sinks')
        edges.push({
          id: 'second-publication',
          sourceId: 'dvt-transform',
          targetId: 'second-sink',
          relation: 'lineage',
        });
      expect(
        buildProtectedDvtPreviewProjection({
          ...input,
          canonicalNodes: nodes,
          canonicalEdges: edges,
        }).ok
      ).toBe(false);
    }
  );
});
