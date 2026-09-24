import { type CanonicalEdge } from '../../types/canonical';
import { type CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { encodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitProjectionSource } from './canvasDvtSubstraitProjection';

export const SOURCE: CanonicalNode = {
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

export const TRANSFORM: CanonicalNode = {
  id: 'transform-orders',
  name: 'Orders Transform',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
};

export const EDGE: CanonicalEdge = {
  id: 'source-transform',
  sourceId: SOURCE.id,
  targetId: TRANSFORM.id,
  relation: 'lineage',
};

export function buildCanonicalTransform(): CanonicalNode {
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
