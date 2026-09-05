import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import {
  createDvtSourceSemanticDraft,
} from './canvasDvtSourceSemanticAuthoring';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source'],
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

function outputIds(node: CanonicalNode): string[] {
  const draft = createDvtSourceSemanticDraft(node);
  if (draft == null) throw new Error('Expected Source semantic draft.');
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  if (!inspection.ok) throw new Error('Expected inspectable Source projection.');
  return inspection.projection.outputs.map((output) => output.fieldId);
}

describe('DVT Source semantic identity', () => {
  it('allocates opaque FieldIds for new physical passthrough outputs', () => {
    const ids = outputIds(source);

    expect(ids).toHaveLength(2);
    ids.forEach((fieldId) => expect(fieldId).toMatch(OPAQUE_FIELD_ID));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).not.toContain('order_id');
    expect(ids[1]).not.toContain('customer');
  });

  it('preserves legacy persisted Source FieldIds as opaque existing identity', () => {
    const projectionSource = resolveDvtSubstraitProjectionSource(source);
    if (projectionSource == null) throw new Error('Expected connected Source.');
    const legacyDraft = createDvtSubstraitProjectionDraft({
      source: projectionSource,
      targetNodeId: source.id,
      outputs: [
        { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
        { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
      ],
    });
    const persisted = applyDvtSubstraitSemanticDocument(
      source,
      encodeDvtSubstraitProjectionDocument(legacyDraft)
    );

    expect(outputIds(persisted)).toEqual(['output:order_id', 'output:customer']);
  });
});
