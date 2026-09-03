import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitFilter,
  inspectDvtSubstraitFilter,
  removeDvtSubstraitFilter,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';

const source: CanonicalNode = {
  id: 'orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: ['source'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
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

function projection() {
  const resolved = resolveDvtSubstraitProjectionSource(source);
  if (resolved == null) throw new Error('Expected a valid Source fixture.');
  return createDvtSubstraitProjectionDraft({
    source: resolved,
    targetNodeId: source.id,
    outputs: resolved.fields.map((field) => ({
      fieldId: `output:${field.name}`,
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
}

describe('DVT Substrait filter', () => {
  it('applies, inspects and removes one admitted text equality predicate', () => {
    const draft = projection();
    const capability = resolveDvtSubstraitFilterCapabilities({
      dataType: 'text',
      provider: 'postgres',
    })[0];
    if (capability == null) throw new Error('Expected an admitted text predicate.');

    const filtered = applyDvtSubstraitFilter(draft, {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });

    expect(filtered).not.toBe(draft);
    expect(inspectDvtSubstraitFilter(filtered)).toEqual({
      fieldId: 'output:customer',
      fieldName: 'customer',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });
    expect(encodeDvtSubstraitProjectionDocument(removeDvtSubstraitFilter(filtered))).toEqual(
      encodeDvtSubstraitProjectionDocument(draft)
    );
  });

  it('rejects unsupported types, capabilities and stale field identities', () => {
    expect(
      resolveDvtSubstraitFilterCapabilities({ dataType: 'integer', provider: 'postgres' })
    ).toEqual([]);
    expect(
      resolveDvtSubstraitFilterCapabilities({ dataType: 'text', provider: 'snowflake' })
    ).toEqual([]);

    const draft = projection();
    expect(
      applyDvtSubstraitFilter(draft, {
        fieldId: 'output:missing',
        dataType: 'text',
        capabilityId: 'unknown',
        value: 'Ada',
      })
    ).toBe(draft);
  });
});
