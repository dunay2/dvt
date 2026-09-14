import { describe, expect, it } from 'vitest';
import { DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';

import documents from '../../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';
import type { CanonicalNode } from '../../types/canonical';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

function fixture(count: 2 | 3): Parameters<typeof buildProtectedDvtPreviewProjection>[0] {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(
    count === 2 ? documents.two : documents.three
  );
  const sources: CanonicalNode[] = document.sidecar.relations.flatMap((relation) =>
    relation.sourceRef === undefined
      ? []
      : [
          {
            id: `source-${relation.displayName}`,
            name: relation.displayName!,
            pluginId: 'dvt.warehouse-source',
            kind: 'dvt:source',
            role: 'input',
            status: 'idle',
            tags: [],
            metadata: {
              connectedSourceRef: relation.sourceRef,
              schema: 'raw',
              tableName: relation.displayName,
            },
          },
        ]
  );
  const transform = applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Joined orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    document
  );
  const nodes = [...sources, transform];
  return {
    canvasId: 'canvas-main',
    canonicalNodes: nodes,
    workspaceNodeIds: nodes.map((node) => node.id),
    selectionIntent: { mode: 'explicit' as const, nodeIds: [transform.id] },
    canonicalEdges: sources.map((source) => ({
      id: `${source.id}-transform`,
      sourceId: source.id,
      targetId: transform.id,
      relation: 'lineage' as const,
    })),
  };
}

describe('N-input protected Preview intent', () => {
  it.each([2, 3] as const)(
    'admits %i sources but sends only upstream selection intent',
    (count) => {
      const input = fixture(count);
      const result = buildProtectedDvtPreviewProjection(input);
      expect(result).toMatchObject({
        ok: true,
        selection: { mode: 'upstream', nodeIds: ['transform-orders'] },
      });
      if (!result.ok) throw new Error(result.message);
      expect(result.derivedDependencyNodeIds).toHaveLength(count);
      expect(result.scopedNodeIds).toEqual([...input.workspaceNodeIds].sort());
      const reversed = buildProtectedDvtPreviewProjection({
        ...input,
        canonicalEdges: [...input.canonicalEdges].reverse(),
      });
      expect(reversed).toEqual(result);
    }
  );

  it('refuses a missing JOIN input and does not silently shrink the closure', () => {
    const input = fixture(3);
    expect(
      buildProtectedDvtPreviewProjection({
        ...input,
        canonicalEdges: input.canonicalEdges.slice(1),
      }).ok
    ).toBe(false);
  });
});
