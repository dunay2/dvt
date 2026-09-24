import { encodeDvtSubstraitSemanticDocument } from '../../views/canvas/canvasDvtSubstraitSemanticDocument';
import { filterProjectionInputFixture } from '../../views/canvas/canvasFilterProjection.test-support';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { resolveDvtSubstraitFilterCapabilities } from '../../views/canvas/canvasFilterCapabilities';

import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from '../../views/canvas/canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from '../../views/canvas/canvasDvtTransformAuthoringAuthority';
import { buildDvtGraphNodeSemanticMetric } from './dvtGraphNodeSemanticMetric';

async function filteredSource(): Promise<CanonicalNode> {
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
  const capability = resolveDvtSubstraitFilterCapabilities({ dataType: 'text' })[0];
  if (resolved == null || capability == null) throw new Error('Expected admitted fixtures.');
  const draft = await filterProjectionInputFixture(
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
  return applyDvtSubstraitSemanticDocument(source, encodeDvtSubstraitSemanticDocument(draft));
}

describe('DVT graph node semantic metric', () => {
  it('does not project a legacy Source FilterRel as card state', async () => {
    expect(buildDvtGraphNodeSemanticMetric(await filteredSource(), 'es')).toBeNull();
  });

  it('projects an admitted Transform FilterRel as a localized card summary', async () => {
    const source = await filteredSource();
    expect(
      buildDvtGraphNodeSemanticMetric(
        { ...source, pluginId: 'dvt', kind: 'dvt:transform', role: 'transform' },
        'es'
      )
    ).toEqual({
      id: 'filter',
      label: 'Filtro',
      value: 'customer = "Ada"',
    });
  });

  it('omits the metric when no filter authority exists', async () => {
    expect(
      buildDvtGraphNodeSemanticMetric(
        {
          ...(await filteredSource()),
          metadata: { columns: [{ name: 'customer', type: 'text' }] },
        },
        'es'
      )
    ).toBeNull();
  });
});
