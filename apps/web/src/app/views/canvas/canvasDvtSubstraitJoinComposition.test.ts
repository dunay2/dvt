import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import {
  createDvtSubstraitInnerJoinDraft,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinDraft,
  type DvtSubstraitJoinSource,
} from './canvasDvtSubstraitJoinComposition';

function sourceRef(connectionId: string, sourceObjectId: string): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId,
      provider: 'postgres',
    },
    sourceObjectId,
  };
}

function source(
  nodeId: string,
  schema: string,
  table: string,
  connectionId = 'warehouse-main'
): DvtSubstraitJoinSource {
  return {
    nodeId,
    schema,
    table,
    sourceRef: sourceRef(connectionId, `${schema}.${table}`),
  };
}

function fixture() {
  return createDvtSubstraitInnerJoinDraft({
    left: source('source-customers', 'public', 'customers'),
    right: source('source-orders', 'public', 'orders'),
    targetNodeId: 'transform-customer-orders',
  });
}

describe('VTX2 typed Substrait INNER JOIN composition', () => {
  it('represents two PostgreSQL sources as one exact semantic join card', () => {
    const draft = fixture();
    const inspection = inspectDvtSubstraitInnerJoinDraft(draft);

    expect(inspection).toEqual({
      ok: true,
      projection: {
        left: {
          schema: 'public',
          table: 'customers',
          sourceRef: sourceRef('warehouse-main', 'public.customers'),
        },
        right: {
          schema: 'public',
          table: 'orders',
          sourceRef: sourceRef('warehouse-main', 'public.orders'),
        },
        leftKey: 'customer_id',
        rightKey: 'customer_id',
        outputs: [
          {
            name: 'customer_id',
            fieldId: 'field:transform-customer-orders:customer_id',
            outputOrdinal: 0,
          },
          {
            name: 'name',
            fieldId: 'field:transform-customer-orders:name',
            outputOrdinal: 1,
          },
          {
            name: 'order_id',
            fieldId: 'field:transform-customer-orders:order_id',
            outputOrdinal: 2,
          },
        ],
      },
    });

    expect(draft.sidecar.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relationId: 'relation:source-customers',
          relAnchor: 1,
          sourceRef: sourceRef('warehouse-main', 'public.customers'),
        }),
        expect.objectContaining({
          relationId: 'relation:source-orders',
          relAnchor: 2,
          sourceRef: sourceRef('warehouse-main', 'public.orders'),
        }),
        expect.objectContaining({
          relationId: 'relation:transform-customer-orders:join',
          relAnchor: 3,
        }),
      ])
    );
  });

  it('serializes deterministically and reloads the same semantic identities', () => {
    const first = encodeDvtSubstraitInnerJoinDocument(fixture());
    const second = encodeDvtSubstraitInnerJoinDocument(fixture());

    expect(second).toEqual(first);
    expect(first.sidecar.semanticPlanSha256).toBe(first.semanticPlan.sha256);

    const reloaded = decodeDvtSubstraitInnerJoinDocument(first);
    const inspection = inspectDvtSubstraitInnerJoinDraft(reloaded);
    expect(inspection.ok).toBe(true);
    expect(reloaded.sidecar.fields.map((field) => field.fieldId)).toEqual(
      fixture().sidecar.fields.map((field) => field.fieldId)
    );
    expect(encodeDvtSubstraitInnerJoinDocument(reloaded)).toEqual(first);
  });

  it('fails closed when the sources do not share one PostgreSQL connection', () => {
    expect(() =>
      createDvtSubstraitInnerJoinDraft({
        left: source('source-customers', 'public', 'customers', 'warehouse-a'),
        right: source('source-orders', 'public', 'orders', 'warehouse-b'),
        targetNodeId: 'transform-customer-orders',
      })
    ).toThrow(/same connection/i);
  });

  it('fails closed when the accepted join shape is changed', () => {
    const draft = fixture();
    const root = draft.plan.relations[0]?.relType;
    if (root?.case !== 'root') throw new Error('Expected root relation.');
    root.value.names[0] = 'unexpected_customer_key';

    expect(inspectDvtSubstraitInnerJoinDraft(draft)).toEqual({ ok: false });
    expect(() => encodeDvtSubstraitInnerJoinDocument(draft)).toThrow(/unsupported/i);
  });
});
