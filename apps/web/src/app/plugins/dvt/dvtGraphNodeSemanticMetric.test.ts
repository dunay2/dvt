import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitFilter,
  encodeDvtSubstraitFilterDocument,
  resolveDvtSubstraitFilterCapabilities,
} from '../../views/canvas/canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from '../../views/canvas/canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from '../../views/canvas/canvasDvtTransformAuthoringAuthority';
import { buildDvtGraphNodeSemanticMetric } from './dvtGraphNodeSemanticMetric';

function filteredSource(): CanonicalNode {
  const source: CanonicalNode = {
    id: 'source-orders',
    name: 'orders',
    pluginId: 'dvt.warehouse-source',
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
      columns: [{ name: 'customer', type: 'text' }],
    },
  };
  const resolved = resolveDvtSubstraitProjectionSource(source);
  const capability = resolveDvtSubstraitFilterCapabilities({
    dataType: 'text',
    provider: 'postgres',
  })[0];
  if (resolved == null || capability == null) throw new Error('Expected admitted fixtures.');
  const draft = applyDvtSubstraitFilter(
    createDvtSubstraitProjectionDraft({
      source: resolved,
      targetNodeId: source.id,
      outputs: [{ fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' }],
    }),
    {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    }
  );
  return applyDvtSubstraitSemanticDocument(source, encodeDvtSubstraitFilterDocument(draft));
}

describe('DVT graph node semantic metric', () => {
  it('projects an admitted Source FilterRel as a localized card summary', () => {
    expect(buildDvtGraphNodeSemanticMetric(filteredSource(), 'es')).toEqual({
      id: 'filter',
      label: 'Filtro',
      value: 'customer = "Ada"',
    });
  });

  it('omits the metric when no filter authority exists', () => {
    expect(
      buildDvtGraphNodeSemanticMetric(
        { ...filteredSource(), metadata: { columns: [{ name: 'customer', type: 'text' }] } },
        'es'
      )
    ).toBeNull();
  });
});
