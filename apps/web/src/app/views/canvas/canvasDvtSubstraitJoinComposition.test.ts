import { describe, expect, it } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { DVT_TRANSFORM_AUTHORING_MODE, type ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

import {
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  applyDvtSubstraitInnerJoinGrouping,
  applyDvtSubstraitInnerJoinFieldEdit,
  createDvtSubstraitInnerJoinDraft,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitInnerJoinDraft,
  removeDvtSubstraitInnerJoinGroupedRowNumber,
  removeDvtSubstraitInnerJoinGrouping,
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

  it('groups and ranks selected INNER JOIN fields in the same canonical revision', () => {
    let selected = applyDvtSubstraitInnerJoinFieldEdit(fixture(), {
      kind: 'rename',
      fieldKey: 'left.name',
      outputName: 'customer_name',
    });
    selected = applyDvtSubstraitInnerJoinFieldEdit(selected, {
      kind: 'move',
      fieldKey: 'left.name',
      direction: 'up',
    });
    selected = applyDvtSubstraitInnerJoinFieldEdit(selected, {
      kind: 'set-selected',
      fieldKey: 'left.customer_id',
      selected: false,
    });

    const grouped = applyDvtSubstraitInnerJoinGrouping(selected, {
      groupFieldId: 'field:transform-customer-orders:name',
      countOutputName: 'order_count',
    });
    expect(inspectDvtSubstraitInnerJoinGroupingDraft(grouped)).toMatchObject({
      ok: true,
      projection: {
        groupField: {
          fieldKey: 'left.name',
          name: 'customer_name',
          fieldId: 'field:transform-customer-orders:name',
          inputOrdinal: 0,
        },
        measure: {
          name: 'order_count',
          fieldId: 'field:transform-customer-orders:join-count',
        },
      },
    });

    const ranked = applyDvtSubstraitInnerJoinGroupedRowNumber(grouped, {
      outputName: 'count_rank',
    });
    const reopened = decodeDvtSubstraitInnerJoinDocument(
      encodeDvtSubstraitInnerJoinDocument(ranked)
    );
    expect(inspectDvtSubstraitInnerJoinGroupedWindowDraft(reopened)).toMatchObject({
      ok: true,
      projection: {
        outputs: [
          expect.objectContaining({ name: 'customer_name', outputOrdinal: 0 }),
          expect.objectContaining({ name: 'order_count', outputOrdinal: 1 }),
          expect.objectContaining({ name: 'count_rank', outputOrdinal: 2 }),
        ],
      },
    });
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
    const persisted = applyDvtNodeAuthoringMetadata(transform, {
      kind: 'sql_transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'inner_join',
      plan: reopened.plan,
      sidecar: reopened.sidecar,
    });
    expect(
      projectCanvasNodePresentationTruth({ node: persisted, nodes: [persisted], edges: [] }).columns
        .visible
    ).toMatchObject([
      { name: 'customer_name', reference: 'field:transform-customer-orders:name' },
      { name: 'order_count', reference: 'field:transform-customer-orders:join-count' },
      { name: 'count_rank', reference: 'field:transform-customer-orders:join-count-rank' },
    ]);

    const restoredGrouped = removeDvtSubstraitInnerJoinGroupedRowNumber(reopened);
    expect(inspectDvtSubstraitInnerJoinGroupingDraft(restoredGrouped).ok).toBe(true);
    const restoredSelected = removeDvtSubstraitInnerJoinGrouping(restoredGrouped);
    expect(inspectDvtSubstraitInnerJoinDraft(restoredSelected)).toEqual(
      inspectDvtSubstraitInnerJoinDraft(selected)
    );
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

  it('fails closed for invalid grouping/window semantics, stale hashes, and duplicate bindings', () => {
    const createGrouped = (): DvtSubstraitInnerJoinDraft =>
      applyDvtSubstraitInnerJoinGrouping(fixture(), {
        groupFieldId: 'field:transform-customer-orders:name',
        countOutputName: 'order_count',
      });

    const wrongGroupingOrdinal = createGrouped();
    const groupingRoot = wrongGroupingOrdinal.plan.relations[0]?.relType;
    const groupingExpression =
      groupingRoot?.case === 'root' && groupingRoot.value.input?.relType.case === 'aggregate'
        ? groupingRoot.value.input.relType.value.groupingExpressions[0]?.rexType
        : null;
    const directReference =
      groupingExpression?.case === 'selection' ? groupingExpression.value.referenceType : null;
    const structField =
      directReference?.case === 'directReference' ? directReference.value.referenceType : null;
    if (structField?.case !== 'structField') throw new Error('Expected grouping field reference.');
    structField.value.field = 99;
    expect(inspectDvtSubstraitInnerJoinGroupingDraft(wrongGroupingOrdinal)).toEqual({ ok: false });

    const wrongWindowOrder = applyDvtSubstraitInnerJoinGroupedRowNumber(createGrouped(), {
      outputName: 'count_rank',
    });
    const windowRoot = wrongWindowOrder.plan.relations[0]?.relType;
    const windowExpression =
      windowRoot?.case === 'root' && windowRoot.value.input?.relType.case === 'project'
        ? windowRoot.value.input.relType.value.expressions[0]?.rexType
        : null;
    const firstSort =
      windowExpression?.case === 'windowFunction' ? windowExpression.value.sorts[0] : null;
    if (firstSort?.sortKind.case !== 'direction') throw new Error('Expected window direction.');
    firstSort.sortKind.value = SortField_SortDirection.ASC_NULLS_LAST;
    expect(inspectDvtSubstraitInnerJoinGroupedWindowDraft(wrongWindowOrder)).toEqual({ ok: false });

    const hashed = decodeDvtSubstraitInnerJoinDocument(
      encodeDvtSubstraitInnerJoinDocument(createGrouped())
    );
    const staleHash: DvtSubstraitInnerJoinDraft = {
      ...hashed,
      sidecar: { ...hashed.sidecar, semanticPlanSha256: 'a'.repeat(64) },
    };
    expect(inspectDvtSubstraitInnerJoinGroupingDraft(staleHash)).toEqual({ ok: false });

    const grouped = createGrouped();
    const joinRelationId = grouped.sidecar.relations.find(
      (relation) => relation.relAnchor === 3
    )?.relationId;
    if (joinRelationId == null) throw new Error('Expected INNER JOIN binding.');
    const duplicateBinding: DvtSubstraitInnerJoinDraft = {
      ...grouped,
      sidecar: {
        ...grouped.sidecar,
        relations: grouped.sidecar.relations.map((relation) =>
          relation.relAnchor === 4 ? { ...relation, relationId: joinRelationId } : relation
        ),
      },
    };
    expect(inspectDvtSubstraitInnerJoinGroupingDraft(duplicateBinding)).toEqual({ ok: false });
  });
});
