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
  appendDvtSubstraitInnerJoinInput,
  createDvtSubstraitInnerJoinDraft,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitInnerJoinDraft,
  inspectDvtSubstraitNInputJoinDraft,
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
  it('repeats one append operation for three and four canonical join inputs', () => {
    const threeInputs = appendDvtSubstraitInnerJoinInput(fixture(), {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id'],
    });
    const fourInputs = appendDvtSubstraitInnerJoinInput(threeInputs, {
      source: source('source-tickets', 'public', 'tickets'),
      fields: ['ticket_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['ticket_id'],
    });

    expect(inspectDvtSubstraitNInputJoinDraft(threeInputs)).toMatchObject({
      ok: true,
      projection: {
        inputs: [
          { nodeId: 'source-customers', table: 'customers' },
          { nodeId: 'source-orders', table: 'orders' },
          { nodeId: 'source-shipments', table: 'shipments' },
        ],
        joins: [
          {
            leftSourceFieldId: 'field:source-customers:customer_id',
            rightSourceFieldId: 'field:source-orders:customer_id',
          },
          {
            leftSourceFieldId: 'field:source-customers:customer_id',
            rightSourceFieldId: 'field:source-shipments:customer_id',
          },
        ],
        outputs: [
          { name: 'customer_id', fieldId: 'field:transform-customer-orders:customer_id' },
          { name: 'name', fieldId: 'field:transform-customer-orders:name' },
          { name: 'order_id', fieldId: 'field:transform-customer-orders:order_id' },
          { name: 'shipment_id', fieldId: 'field:transform-customer-orders:shipment_id' },
        ],
      },
    });
    expect(inspectDvtSubstraitNInputJoinDraft(fourInputs)).toMatchObject({
      ok: true,
      projection: {
        inputs: [
          { nodeId: 'source-customers', table: 'customers' },
          { nodeId: 'source-orders', table: 'orders' },
          { nodeId: 'source-shipments', table: 'shipments' },
          { nodeId: 'source-tickets', table: 'tickets' },
        ],
        outputs: [
          { name: 'customer_id' },
          { name: 'name' },
          { name: 'order_id' },
          { name: 'shipment_id' },
          { name: 'ticket_id' },
        ],
      },
    });
    const document = encodeDvtSubstraitInnerJoinDocument(fourInputs);
    const reloaded = decodeDvtSubstraitInnerJoinDocument(document);
    expect(inspectDvtSubstraitNInputJoinDraft(reloaded)).toEqual(
      inspectDvtSubstraitNInputJoinDraft(fourInputs)
    );
    expect(encodeDvtSubstraitInnerJoinDocument(reloaded)).toEqual(document);
  });

  it('inspects appended sources using their actual compatible field counts', () => {
    const appended = appendDvtSubstraitInnerJoinInput(fixture(), {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id', 'status'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id', 'status'],
    });

    expect(inspectDvtSubstraitNInputJoinDraft(appended)).toMatchObject({
      ok: true,
      projection: {
        inputs: [
          {},
          {},
          {
            nodeId: 'source-shipments',
            fields: [{ name: 'shipment_id' }, { name: 'customer_id' }, { name: 'status' }],
          },
        ],
        outputs: [{}, {}, {}, { name: 'shipment_id' }, { name: 'status' }],
      },
    });
    expect(() => encodeDvtSubstraitInnerJoinDocument(appended)).not.toThrow();
  });

  it('selects, renames, and reorders fields over the same three- and four-input join path', () => {
    const threeInputs = appendDvtSubstraitInnerJoinInput(fixture(), {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id'],
    });
    const fourInputs = appendDvtSubstraitInnerJoinInput(threeInputs, {
      source: source('source-tickets', 'public', 'tickets'),
      fields: ['ticket_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['ticket_id'],
    });

    for (const draft of [threeInputs, fourInputs]) {
      const selected = applyDvtSubstraitInnerJoinFieldEdit(draft, {
        kind: 'set-selected',
        sourceFieldId: 'field:source-shipments:customer_id',
        selected: true,
      });
      const selectedInspection = inspectDvtSubstraitNInputJoinDraft(selected);
      if (!selectedInspection.ok) throw new Error('Expected admitted N-input field selection.');
      const selectedOutput = selectedInspection.projection.outputs.find(
        (output) => output.source.fieldId === 'field:source-shipments:customer_id'
      );
      expect(selectedOutput).toMatchObject({ name: 'shipments_customer_id' });

      const renamed = applyDvtSubstraitInnerJoinFieldEdit(selected, {
        kind: 'rename',
        sourceFieldId: 'field:source-shipments:customer_id',
        outputName: 'shipping_customer',
      });
      const moved = applyDvtSubstraitInnerJoinFieldEdit(renamed, {
        kind: 'move',
        sourceFieldId: 'field:source-shipments:customer_id',
        direction: 'up',
      });
      const reloaded = decodeDvtSubstraitInnerJoinDocument(
        encodeDvtSubstraitInnerJoinDocument(moved)
      );
      const inspection = inspectDvtSubstraitNInputJoinDraft(reloaded);
      if (!inspection.ok) throw new Error('Expected admitted reloaded N-input field edit.');
      const output = inspection.projection.outputs.find(
        (candidate) => candidate.source.fieldId === 'field:source-shipments:customer_id'
      );

      expect(output).toMatchObject({
        name: 'shipping_customer',
        fieldId: selectedOutput?.fieldId,
      });
      expect(inspection.projection.outputs.at(-2)?.source.fieldId).toBe(
        'field:source-shipments:customer_id'
      );
      expect(encodeDvtSubstraitInnerJoinDocument(reloaded)).toEqual(
        encodeDvtSubstraitInnerJoinDocument(moved)
      );
    }
  });

  it('fails N-input field edits closed for stale identities, duplicate names, and empty output', () => {
    const draft = appendDvtSubstraitInnerJoinInput(fixture(), {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id'],
    });

    expect(
      applyDvtSubstraitInnerJoinFieldEdit(draft, {
        kind: 'rename',
        sourceFieldId: 'field:source-stale:missing',
        outputName: 'ignored',
      })
    ).toBe(draft);
    expect(
      applyDvtSubstraitInnerJoinFieldEdit(draft, {
        kind: 'rename',
        sourceFieldId: 'field:source-shipments:shipment_id',
        outputName: 'name',
      })
    ).toBe(draft);

    let oneOutput = draft;
    for (const sourceFieldId of [
      'field:source-customers:customer_id',
      'field:source-customers:name',
      'field:source-orders:order_id',
    ]) {
      oneOutput = applyDvtSubstraitInnerJoinFieldEdit(oneOutput, {
        kind: 'set-selected',
        sourceFieldId,
        selected: false,
      });
    }
    const rejectedEmpty = applyDvtSubstraitInnerJoinFieldEdit(oneOutput, {
      kind: 'set-selected',
      sourceFieldId: 'field:source-shipments:shipment_id',
      selected: false,
    });
    expect(rejectedEmpty).toBe(oneOutput);
    expect(inspectDvtSubstraitNInputJoinDraft(oneOutput)).toMatchObject({
      ok: true,
      projection: { outputs: [{ source: { fieldId: 'field:source-shipments:shipment_id' } }] },
    });
  });

  it('groups and ranks the same three- and four-input recursive join revision', () => {
    const threeInputs = appendDvtSubstraitInnerJoinInput(fixture(), {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id'],
    });
    const fourInputs = appendDvtSubstraitInnerJoinInput(threeInputs, {
      source: source('source-tickets', 'public', 'tickets'),
      fields: ['ticket_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['ticket_id'],
    });

    for (const draft of [threeInputs, fourInputs]) {
      const grouped = applyDvtSubstraitInnerJoinGrouping(draft, {
        groupFieldId: 'field:transform-customer-orders:shipment_id',
        countOutputName: 'shipment_count',
      });
      expect(inspectDvtSubstraitInnerJoinGroupingDraft(grouped)).toMatchObject({
        ok: true,
        projection: {
          kind: 'n-input',
          inputs: expect.arrayContaining([expect.objectContaining({ nodeId: 'source-shipments' })]),
          groupField: {
            name: 'shipment_id',
            fieldId: 'field:transform-customer-orders:shipment_id',
            source: {
              nodeId: 'source-shipments',
              fieldId: 'field:source-shipments:shipment_id',
            },
          },
          measure: { name: 'shipment_count' },
        },
      });

      const ranked = applyDvtSubstraitInnerJoinGroupedRowNumber(grouped, {
        outputName: 'shipment_rank',
      });
      const reloaded = decodeDvtSubstraitInnerJoinDocument(
        encodeDvtSubstraitInnerJoinDocument(ranked)
      );
      expect(inspectDvtSubstraitInnerJoinGroupedWindowDraft(reloaded)).toMatchObject({
        ok: true,
        projection: {
          kind: 'n-input',
          groupField: { name: 'shipment_id' },
          measure: { name: 'shipment_count' },
          result: { name: 'shipment_rank' },
        },
      });
      expect(
        encodeDvtSubstraitInnerJoinDocument(
          removeDvtSubstraitInnerJoinGrouping(removeDvtSubstraitInnerJoinGroupedRowNumber(reloaded))
        )
      ).toEqual(encodeDvtSubstraitInnerJoinDocument(draft));
    }
  });

  it('fails N-input grouping and ranking closed for stale fields and duplicate outputs', () => {
    const draft = appendDvtSubstraitInnerJoinInput(fixture(), {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id'],
    });
    expect(
      applyDvtSubstraitInnerJoinGrouping(draft, {
        groupFieldId: 'field:transform-customer-orders:stale',
        countOutputName: 'shipment_count',
      })
    ).toBe(draft);
    expect(
      applyDvtSubstraitInnerJoinGrouping(draft, {
        groupFieldId: 'field:transform-customer-orders:shipment_id',
        countOutputName: 'shipment_id',
      })
    ).toBe(draft);

    const grouped = applyDvtSubstraitInnerJoinGrouping(draft, {
      groupFieldId: 'field:transform-customer-orders:shipment_id',
      countOutputName: 'shipment_count',
    });
    expect(
      applyDvtSubstraitInnerJoinGroupedRowNumber(grouped, { outputName: 'shipment_count' })
    ).toBe(grouped);
  });

  it('rejects duplicate, stale-predicate and incompatible append attempts without mutation', () => {
    const draft = fixture();
    const append = (
      overrides: {
        source?: DvtSubstraitJoinSource;
        leftSourceFieldId?: string;
      } = {}
    ): DvtSubstraitInnerJoinDraft =>
      appendDvtSubstraitInnerJoinInput(draft, {
        source: overrides.source ?? source('source-shipments', 'public', 'shipments'),
        fields: ['shipment_id', 'customer_id'],
        predicate: {
          leftSourceFieldId: overrides.leftSourceFieldId ?? 'field:source-customers:customer_id',
          rightFieldName: 'customer_id',
        },
        selectedFields: ['shipment_id'],
      });

    expect(append({ source: source('source-orders', 'public', 'orders') })).toBe(draft);
    expect(append({ leftSourceFieldId: 'field:retired-source:customer_id' })).toBe(draft);
    expect(
      append({
        source: source('source-shipments', 'public', 'shipments', 'warehouse-other'),
      })
    ).toBe(draft);
  });

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
            dataType: 'string',
            outputOrdinal: 0,
            source: { relation: 'left', name: 'customer_id' },
          },
          {
            fieldKey: 'left.name',
            name: 'name',
            fieldId: 'field:transform-customer-orders:name',
            dataType: 'string',
            outputOrdinal: 1,
            source: { relation: 'left', name: 'name' },
          },
          {
            fieldKey: 'right.order_id',
            name: 'order_id',
            fieldId: 'field:transform-customer-orders:order_id',
            dataType: 'string',
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
            dataType: 'string',
            outputOrdinal: 0,
            source: { relation: 'right', name: 'order_id' },
          },
          {
            fieldKey: 'left.name',
            fieldId: nameFieldId,
            name: 'customer_name',
            dataType: 'string',
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
      {
        name: 'customer_name',
        type: 'string',
        reference: 'field:transform-customer-orders:name',
      },
      {
        name: 'order_count',
        type: 'i64',
        reference: 'field:transform-customer-orders:join-count',
      },
      {
        name: 'count_rank',
        type: 'i64',
        reference: 'field:transform-customer-orders:join-count-rank',
      },
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
