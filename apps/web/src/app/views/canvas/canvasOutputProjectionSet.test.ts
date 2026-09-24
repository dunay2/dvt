import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { type ConnectedSourceRef } from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { type CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import { createDvtSubstraitUnionDistinctDraft } from './canvasDvtSubstraitSetComposition';
import { encodeDvtSubstraitUnionAllDocument } from './canvasDvtSubstraitSetComposition';
import { SOURCE, TRANSFORM, EDGE } from './canvasOutputProjection.test-support';

describe('Canonical output projection', () => {
  it('projects connected UNION DISTINCT authority as PostgreSQL UNION', async () => {
    const setSource = (id: string): CanonicalNode => ({
      ...SOURCE,
      id,
      name: id,
      metadata: {
        ...SOURCE.metadata,
        tableName: id,
        columns: [{ name: 'customer_id', type: 'string' }],
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
    });
    const north = setSource('customers_north');
    const south = setSource('customers_south');
    const draft = createDvtSubstraitUnionDistinctDraft({
      inputs: [north, south].map((source) => ({
        nodeId: source.id,
        schema: 'raw',
        table: source.id,
        fields: [{ name: 'customer_id', type: 'string' as const }],
        sourceRef: source.metadata?.connectedSourceRef as ConnectedSourceRef,
      })),
      targetNodeId: TRANSFORM.id,
    });
    const transform = applyDvtSubstraitSemanticDocument(
      TRANSFORM,
      encodeDvtSubstraitUnionAllDocument(draft)
    );
    const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
      transformNode: transform,
      nodes: [north, south, transform],
      edges: [
        { ...EDGE, id: 'north-transform', sourceId: north.id },
        { ...EDGE, id: 'south-transform', sourceId: south.id },
      ],
    });

    expect(sql.length).toBeGreaterThan(0);
    const bound = resolveCanvasSubstraitGraphBindings({
      node: transform,
      nodes: [north, south, transform],
      edges: [
        { sourceId: north.id, targetId: transform.id },
        { sourceId: south.id, targetId: transform.id },
      ],
    });
    expect(deriveSubstraitSchemas(bound.document).schemas.get(bound.index.rootId)).toHaveLength(1);
    await expect(
      projectDvtSubstraitTransformOutputToPostgresSql({
        transformNode: transform,
        nodes: [north, south, transform],
        edges: [{ ...EDGE, id: 'north-transform', sourceId: north.id }],
      })
    ).rejects.toThrow('source identities do not match');
  });
});
