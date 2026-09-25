import { describe, expect, it } from 'vitest';
import { DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';

import documents from '../../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';
import type { CanonicalNode } from '../../types/canonical';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { createSourceSet } from './canvasSourceSet';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

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

  it('admits persisted UNION DISTINCT through the same protected Preview rail', () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const sourceSpecs = ['north', 'south', 'west'].map((table) => ({
      nodeId: `source-${table}`,
      schema: 'raw',
      table,
      fields: [{ name: 'customer_id', type: 'string' as const }],
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1' as const,
        connectionRef,
        sourceObjectId: `raw.${table}`,
      },
    }));
    const document = encodeDvtSubstraitSemanticDocument(
      createSourceSet({
        ...{
          inputs: sourceSpecs,
          targetNodeId: 'transform-customers',
        },
        operation: 'union_distinct',
      })
    );
    const sources: CanonicalNode[] = sourceSpecs.map((source) => ({
      id: source.nodeId,
      name: source.table,
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        connectedSourceRef: source.sourceRef,
        schema: source.schema,
        tableName: source.table,
      },
    }));
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-customers',
        name: 'Distinct customers',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
      document
    );
    const nodes = [...sources, transform];
    const result = buildProtectedDvtPreviewProjection({
      canvasId: 'canvas-main',
      canonicalNodes: nodes,
      workspaceNodeIds: nodes.map((node) => node.id),
      selectionIntent: { mode: 'explicit', nodeIds: [transform.id] },
      canonicalEdges: sources.map((source) => ({
        id: `${source.id}-transform`,
        sourceId: source.id,
        targetId: transform.id,
        relation: 'lineage',
      })),
    });

    expect(result).toMatchObject({
      ok: true,
      selection: { mode: 'upstream', nodeIds: ['transform-customers'] },
      derivedDependencyNodeIds: ['source-north', 'source-south', 'source-west'],
    });
  });
});
