import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';

const SOURCE: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-main',
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

const TRANSFORM: CanonicalNode = {
  id: 'transform-orders',
  name: 'Orders Transform',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
};

const EDGE: CanonicalEdge = {
  id: 'source-transform',
  sourceId: SOURCE.id,
  targetId: TRANSFORM.id,
  relation: 'lineage',
};

function buildCanonicalTransform(): CanonicalNode {
  const source = resolveDvtSubstraitProjectionSource(SOURCE);
  if (source == null) throw new Error('Expected a connected PostgreSQL source fixture.');
  return applyDvtSubstraitSemanticDocument(
    TRANSFORM,
    encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: TRANSFORM.id,
        outputs: [
          { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
          { fieldId: 'output:customer', name: 'customer_name', sourceFieldName: 'customer' },
        ],
      })
    )
  );
}

describe('DVT Substrait output projection', () => {
  it('projects PostgreSQL SQL from the exact connected canonical revision', async () => {
    const transform = buildCanonicalTransform();

    const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
      transformNode: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
    });

    expect(sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select order_id, customer as customer_name from raw\.orders;?$/
    );
  });

  it('fails closed when the connected source no longer matches the canonical sidecar', async () => {
    const transform = buildCanonicalTransform();

    await expect(
      projectDvtSubstraitTransformOutputToPostgresSql({
        transformNode: transform,
        nodes: [
          {
            ...SOURCE,
            metadata: { ...SOURCE.metadata, tableName: 'other_orders' },
          },
          transform,
        ],
        edges: [EDGE],
      })
    ).rejects.toThrow('source identities do not match');
  });
});
