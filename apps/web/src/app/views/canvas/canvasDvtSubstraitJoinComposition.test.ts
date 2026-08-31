import { describe, expect, it } from 'vitest';

import { DVT_TRANSFORM_AUTHORING_MODE, type ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

import {
  applyDvtSubstraitInnerJoinFieldEdit,
  createDvtSubstraitInnerJoinDraft,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinDraft,
  type DvtSubstraitInnerJoinDraft,
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

function fixture(): DvtSubstraitInnerJoinDraft {
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
            fieldKey: 'left.customer_id',
            name: 'customer_id',
            fieldId: 'field:transform-customer-orders:customer_id',
            outputOrdinal: 0,
            source: { relation: 'left', name: 'customer_id' },
          },
          {
            fieldKey: 'left.name',
            name: 'name',
            fieldId: 'field:transform-customer-orders:name',
            outputOrdinal: 1,
            source: { relation: 'left', name: 'name' },
          },
          {
            fieldKey: 'right.order_id',
            name: 'order_id',
            fieldId: 'field:transform-customer-orders:order_id',
            outputOrdinal: 2,
            source: { relation: 'right', name: 'order_id' },
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

  it('selects, renames, and reorders joined fields while preserving FieldId through reload', () => {
    const original = inspectDvtSubstraitInnerJoinDraft(fixture());
    if (!original.ok) throw new Error('Expected admitted INNER JOIN fixture.');
    const nameFieldId = original.projection.outputs[1]?.fieldId;

    let edited = applyDvtSubstraitInnerJoinFieldEdit(fixture(), {
      kind: 'rename',
      fieldKey: 'left.name',
      outputName: 'customer_name',
    });
    edited = applyDvtSubstraitInnerJoinFieldEdit(edited, {
      kind: 'move',
      fieldKey: 'right.order_id',
      direction: 'up',
    });
    edited = applyDvtSubstraitInnerJoinFieldEdit(edited, {
      kind: 'set-selected',
      fieldKey: 'left.customer_id',
      selected: false,
    });

    const document = encodeDvtSubstraitInnerJoinDocument(edited);
    const reloaded = decodeDvtSubstraitInnerJoinDocument(document);
    const inspection = inspectDvtSubstraitInnerJoinDraft(reloaded);

    expect(inspection).toEqual({
      ok: true,
      projection: expect.objectContaining({
        outputs: [
          {
            fieldKey: 'right.order_id',
            fieldId: 'field:transform-customer-orders:order_id',
            name: 'order_id',
            outputOrdinal: 0,
            source: { relation: 'right', name: 'order_id' },
          },
          {
            fieldKey: 'left.name',
            fieldId: nameFieldId,
            name: 'customer_name',
            outputOrdinal: 1,
            source: { relation: 'left', name: 'name' },
          },
        ],
      }),
    });
    expect(encodeDvtSubstraitInnerJoinDocument(reloaded)).toEqual(document);

    const restored = applyDvtSubstraitInnerJoinFieldEdit(reloaded, {
      kind: 'set-selected',
      fieldKey: 'left.customer_id',
      selected: true,
    });
    const restoredInspection = inspectDvtSubstraitInnerJoinDraft(restored);
    expect(restoredInspection.ok && restoredInspection.projection.outputs[2]).toMatchObject({
      fieldKey: 'left.customer_id',
      fieldId: 'field:transform-customer-orders:customer_id',
      name: 'customer_id',
    });
  });

  it('fails closed instead of excluding the last selected joined field', () => {
    let edited = applyDvtSubstraitInnerJoinFieldEdit(fixture(), {
      kind: 'set-selected',
      fieldKey: 'left.name',
      selected: false,
    });
    edited = applyDvtSubstraitInnerJoinFieldEdit(edited, {
      kind: 'set-selected',
      fieldKey: 'right.order_id',
      selected: false,
    });
    const beforeRejectedEdit = edited;

    edited = applyDvtSubstraitInnerJoinFieldEdit(edited, {
      kind: 'set-selected',
      fieldKey: 'left.customer_id',
      selected: false,
    });

    expect(edited).toBe(beforeRejectedEdit);
    expect(inspectDvtSubstraitInnerJoinDraft(edited)).toMatchObject({
      ok: true,
      projection: { outputs: [expect.objectContaining({ fieldKey: 'left.customer_id' })] },
    });
  });

  it('persists and reopens the same INNER JOIN through ConfigureCanvasDvtNode metadata', () => {
    const transform: CanonicalNode = {
      id: 'transform-customer-orders',
      name: 'Customer orders',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      role: 'transform',
      status: 'idle',
      tags: ['authoring'],
      metadata: {},
    };
    const draft = fixture();

    const persisted = applyDvtNodeAuthoringMetadata(transform, {
      kind: 'sql_transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'inner_join',
      plan: draft.plan,
      sidecar: draft.sidecar,
    });
    const reopened = createDvtNodeAuthoringMetadata(persisted);

    expect(reopened).toMatchObject({
      kind: 'sql_transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'inner_join',
    });
    if (
      reopened?.kind !== 'sql_transform' ||
      reopened.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait
    ) {
      throw new Error('Expected reopened Substrait authoring metadata.');
    }
    expect(
      encodeDvtSubstraitInnerJoinDocument({ plan: reopened.plan, sidecar: reopened.sidecar })
    ).toEqual(encodeDvtSubstraitInnerJoinDocument(draft));
    expect(
      projectCanvasNodePresentationTruth({ node: persisted, nodes: [persisted], edges: [] }).columns
        .visible
    ).toMatchObject([
      { name: 'customer_id', reference: 'field:transform-customer-orders:customer_id' },
      { name: 'name', reference: 'field:transform-customer-orders:name' },
      { name: 'order_id', reference: 'field:transform-customer-orders:order_id' },
    ]);
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
