import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import {
  applyDvtSubstraitFilter,
  encodeDvtSubstraitFilterDocument,
  resolveDvtSubstraitFilterCapabilities,
} from '../views/canvas/canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from '../views/canvas/canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from '../views/canvas/canvasDvtTransformAuthoringAuthority';

export const SEMANTIC_WORKBENCH_SOURCE: CanonicalNode = {
  id: 'lab-source-orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['semantic-workbench'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'semantic-workbench-local',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    },
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer_id', type: 'integer' },
      { name: 'amount', type: 'numeric' },
      { name: 'discount', type: 'numeric' },
      { name: 'country', type: 'text' },
      { name: 'vip', type: 'boolean' },
      { name: 'order_date', type: 'timestamp' },
    ],
  },
};

const BASE_TRANSFORM: CanonicalNode = {
  id: 'lab-transform-orders',
  name: 'Orders Transform',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['semantic-workbench'],
  metadata: {},
};

function buildSemanticWorkbenchTransform(): CanonicalNode {
  const source = resolveDvtSubstraitProjectionSource(SEMANTIC_WORKBENCH_SOURCE);
  const equality = resolveDvtSubstraitFilterCapabilities({
    dataType: 'text',
    provider: 'postgres',
  })[0];
  if (source == null || equality == null) {
    throw new Error('Semantic Workbench requires the admitted DVT projection and filter capabilities.');
  }

  const projection = createDvtSubstraitProjectionDraft({
    source,
    targetNodeId: BASE_TRANSFORM.id,
    outputs: source.fields.map((field) => ({
      fieldId: `lab-output:${field.name}`,
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
  const countryField = projection.sidecar.fields.find(
    (field) => field.displayName === 'country' && field.fieldId === 'lab-output:country'
  );
  if (countryField == null) throw new Error('Semantic Workbench country output is missing.');

  const filtered = applyDvtSubstraitFilter(projection, {
    fieldId: countryField.fieldId,
    dataType: 'text',
    capabilityId: equality.capabilityId,
    value: 'ES',
  });

  return applyDvtSubstraitSemanticDocument(
    BASE_TRANSFORM,
    encodeDvtSubstraitFilterDocument(filtered)
  );
}

export const SEMANTIC_WORKBENCH_TRANSFORM = buildSemanticWorkbenchTransform();

export const SEMANTIC_WORKBENCH_EDGE: CanonicalEdge = {
  id: 'lab-source-transform',
  sourceId: SEMANTIC_WORKBENCH_SOURCE.id,
  targetId: SEMANTIC_WORKBENCH_TRANSFORM.id,
  relation: 'lineage',
};
