import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  appendDvtSubstraitInnerJoinInput,
  applyDvtSubstraitInnerJoinFieldEdit,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  applyDvtSubstraitInnerJoinGrouping,
  createDvtSubstraitInnerJoinDraft,
  createDvtSubstraitStringInnerJoinDraft,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinDraft,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitNInputJoinDraft,
  removeDvtSubstraitInnerJoinGroupedRowNumber,
  removeDvtSubstraitInnerJoinGrouping,
  renameDvtSubstraitInnerJoinCountOutput,
  renameDvtSubstraitInnerJoinGroupedRowNumberOutput,
  resolveDvtSubstraitNInputJoinEntry,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitJoinInput,
  type DvtSubstraitJoinSource,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

const OPAQUE_RELATION_ID =
  /^dvt_rel_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function connectedSourceRef(
  table: string,
  connectionId = 'warehouse-main'
): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId,
      provider: 'postgres',
    },
    sourceObjectId: `public.${table}`,
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
    sourceRef: connectedSourceRef(table, connectionId),
  };
}

function fixture(): DvtSubstraitInnerJoinDraft {
  return createDvtSubstraitInnerJoinDraft({
    left: source('source-customers', 'public', 'customers'),
    right: source('source-orders', 'public', 'orders'),
    targetNodeId: 'transform-customer-orders',
  });
}

function inspectNInput(draft: DvtSubstraitInnerJoinDraft): DvtSubstraitNInputJoinProjection {
  const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspection.ok) throw new Error('Expected inspectable N-input JOIN.');
  return inspection.projection;
}

function outputByName(
  projection: DvtSubstraitNInputJoinProjection,
  name: string
): DvtSubstraitNInputJoinProjection['outputs'][number] {
  const output = projection.outputs.find((candidate) => candidate.name === name);
  if (output == null) throw new Error(`Expected output ${name}.`);
  return output;
}

function inputFieldId(
  projection: DvtSubstraitNInputJoinProjection,
  inputIndex: number,
  name: string
): string {
  const fieldId = projection.inputs[inputIndex]?.fields.find((field) => field.name === name)?.fieldId;
  if (fieldId == null) throw new Error(`Expected input ${inputIndex}.${name}.`);
  return fieldId;
}

function expectOpaqueNewIdentity(draft: DvtSubstraitInnerJoinDraft): void {
  draft.sidecar.relations.forEach((relation) => expect(relation.relationId).toMatch(OPAQUE_RELATION_ID));
  draft.sidecar.fields.forEach((field) => expect(field.fieldId).toMatch(OPAQUE_FIELD_ID));
  expect(new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size).toBe(
    draft.sidecar.relations.length
  );
  expect(new Set(draft.sidecar.fields.map((field) => field.fieldId)).size).toBe(
    draft.sidecar.fields.length
  );
}

function appendShipmentInput(draft: DvtSubstraitInnerJoinDraft): DvtSubstraitInnerJoinDraft {
  const projection = inspectNInput(draft);
  const leftSourceFieldId = outputByName(projection, 'customer_id').source.fieldId;
  return appendDvtSubstraitInnerJoinInput(draft, {
    source: source('source-shipments', 'public', 'shipments'),
    fields: ['shipment_id', 'customer_id'],
    predicate: {
      leftSourceFieldId,
      rightFieldName: 'customer_id',
    },
    selectedFields: ['shipment_id'],
  });
}

function appendPaymentInput(draft: DvtSubstraitInnerJoinDraft): DvtSubstraitInnerJoinDraft {
  const projection = inspectNInput(draft);
  const leftSourceFieldId = outputByName(projection, 'order_id').source.fieldId;
  return appendDvtSubstraitInnerJoinInput(draft, {
    source: source('source-payments', 'public', 'payments'),
    fields: ['payment_id', 'order_id'],
    predicate: {
      leftSourceFieldId,
      rightFieldName: 'order_id',
    },
    selectedFields: ['payment_id'],
  });
}

function canonicalSource(
  id: string,
  table: string,
  fields: readonly string[]
): CanonicalNode {
  return {
    id,
    name: table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'public',
      tableName: table,
      connectedSourceRef: connectedSourceRef(table),
      columns: fields.map((name) => ({ name, type: 'string' })),
    },
  };
}

function legacyBinaryDraft(draft: DvtSubstraitInnerJoinDraft): DvtSubstraitInnerJoinDraft {
  const relationByAnchor = new Map<number, string>([
    [1, 'relation:source-customers'],
    [2, 'relation:source-orders'],
    [3, 'relation:transform-customer-orders:join'],
  ]);
  const relationMap = new Map(
    draft.sidecar.relations.map((relation) => [
      relation.relationId,
      relationByAnchor.get(relation.relAnchor) ?? relation.relationId,
    ])
  );
  const fieldMap = new Map<string, string>();
  for (const field of draft.sidecar.fields) {
    const relation = draft.sidecar.relations.find(
      (candidate) => candidate.relationId === field.relationId
    );
    const name = field.displayName ?? `field_${field.outputOrdinal}`;
    if (relation?.relAnchor === 1) fieldMap.set(field.fieldId, `field:source-customers:${name}`);
    else if (relation?.relAnchor === 2) fieldMap.set(field.fieldId, `field:source-orders:${name}`);
    else fieldMap.set(field.fieldId, `field:transform-customer-orders:${name}`);
  }
  return {
    plan: draft.plan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.map((relation) => ({
        ...relation,
        relationId: relationMap.get(relation.relationId)!,
      })),
      fields: draft.sidecar.fields.map((field) => ({
        ...field,
        fieldId: fieldMap.get(field.fieldId)!,
        relationId: relationMap.get(field.relationId)!,
        ...(field.sourceFieldId == null
          ? {}
          : { sourceFieldId: fieldMap.get(field.sourceFieldId) ?? field.sourceFieldId }),
      })),
    },
  };
}

describe('DVT Substrait INNER JOIN identity', () => {
  it('allocates opaque persisted identities while keeping predicates structural', () => {
    const draft = fixture();
    const projection = inspectNInput(draft);
    const binary = inspectDvtSubstraitInnerJoinDraft(draft);

    expect(binary.ok).toBe(true);
    expectOpaqueNewIdentity(draft);
    expect(projection.inputs).toHaveLength(2);
    expect(projection.joinRelations).toHaveLength(1);
    expect(projection.joins).toEqual([
      {
        leftSourceFieldId: inputFieldId(projection, 0, 'customer_id'),
        rightSourceFieldId: inputFieldId(projection, 1, 'customer_id'),
      },
    ]);
    expect(projection.outputs.map((output) => output.name)).toEqual([
      'customer_id',
      'name',
      'order_id',
    ]);
    expect(projection.outputs.map((output) => output.source.inputIndex)).toEqual([0, 0, 1]);
  });

  it('keeps the surviving input, result and output identities when a third input is appended', () => {
    const beforeDraft = fixture();
    const before = inspectNInput(beforeDraft);
    const beforeInputRelationIds = before.inputs.map((input) => input.relationId);
    const beforeInputFieldIds = before.inputs.map((input) => input.fields.map((field) => field.fieldId));
    const beforeResultRelationId = before.joinRelations.at(-1)?.relationId;
    const beforeOutputIds = new Map(before.outputs.map((output) => [output.name, output.fieldId]));

    const afterDraft = appendShipmentInput(beforeDraft);
    const after = inspectNInput(afterDraft);

    expect(after.inputs).toHaveLength(3);
    expect(after.inputs.slice(0, 2).map((input) => input.relationId)).toEqual(beforeInputRelationIds);
    expect(after.inputs.slice(0, 2).map((input) => input.fields.map((field) => field.fieldId))).toEqual(
      beforeInputFieldIds
    );
    expect(after.joinRelations.at(-1)?.relationId).toBe(beforeResultRelationId);
    for (const [name, fieldId] of beforeOutputIds) {
      expect(outputByName(after, name).fieldId).toBe(fieldId);
    }
    expect(outputByName(after, 'shipment_id').fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(after.inputs[2]?.relationId).toMatch(OPAQUE_RELATION_ID);
    after.inputs[2]?.fields.forEach((field) => expect(field.fieldId).toMatch(OPAQUE_FIELD_ID));
    expect(after.joinRelations[0]?.relationId).toMatch(OPAQUE_RELATION_ID);
    expect(after.joinRelations[0]?.relationId).not.toBe(beforeResultRelationId);
  });

  it('continues preserving existing identity across a fourth input append', () => {
    const threeDraft = appendShipmentInput(fixture());
    const three = inspectNInput(threeDraft);
    const outputIds = new Map(three.outputs.map((output) => [output.name, output.fieldId]));
    const resultRelationId = three.joinRelations.at(-1)?.relationId;

    const fourDraft = appendPaymentInput(threeDraft);
    const four = inspectNInput(fourDraft);

    expect(four.inputs).toHaveLength(4);
    expect(four.joinRelations.at(-1)?.relationId).toBe(resultRelationId);
    for (const [name, fieldId] of outputIds) {
      expect(outputByName(four, name).fieldId).toBe(fieldId);
    }
    expect(outputByName(four, 'payment_id').fieldId).toMatch(OPAQUE_FIELD_ID);
  });

  it('preserves an N-input output FieldId through rename and reorder', () => {
    const draft = appendShipmentInput(fixture());
    const projection = inspectNInput(draft);
    const shipment = outputByName(projection, 'shipment_id');

    const renamed = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'rename',
      sourceFieldId: shipment.source.fieldId,
      outputName: 'parcel_id',
    });
    const renamedProjection = inspectNInput(renamed);
    expect(outputByName(renamedProjection, 'parcel_id').fieldId).toBe(shipment.fieldId);

    const moved = applyDvtSubstraitInnerJoinFieldEdit(renamed, {
      kind: 'move',
      sourceFieldId: shipment.source.fieldId,
      direction: 'up',
    });
    const movedProjection = inspectNInput(moved);
    expect(outputByName(movedProjection, 'parcel_id').fieldId).toBe(shipment.fieldId);
  });

  it('allocates a fresh FieldId when an output is deleted and recreated', () => {
    const draft = fixture();
    const before = inspectDvtSubstraitInnerJoinDraft(draft);
    if (!before.ok) throw new Error('Expected binary JOIN.');
    const original = before.projection.outputs.find((output) => output.fieldKey === 'right.order_id');
    if (original == null) throw new Error('Expected order output.');

    const removed = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'set-selected',
      fieldKey: 'right.order_id',
      selected: false,
    });
    const recreated = applyDvtSubstraitInnerJoinFieldEdit(removed, {
      kind: 'set-selected',
      fieldKey: 'right.order_id',
      selected: true,
    });
    const after = inspectDvtSubstraitInnerJoinDraft(recreated);
    if (!after.ok) throw new Error('Expected recreated binary JOIN.');
    const replacement = after.projection.outputs.find((output) => output.fieldKey === 'right.order_id');

    expect(replacement?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(replacement?.fieldId).not.toBe(original.fieldId);
  });

  it('treats collision handling as a display-name concern rather than an identity factory', () => {
    const left: DvtSubstraitJoinInput = {
      source: source('source-left', 'public', 'left_table'),
      fields: ['id', 'value'],
    };
    const right: DvtSubstraitJoinInput = {
      source: source('source-right', 'public', 'right_table'),
      fields: ['id', 'value'],
    };
    const draft = createDvtSubstraitStringInnerJoinDraft({
      left,
      right,
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'transform-string-join',
    });
    const projection = inspectNInput(draft);

    expect(new Set(projection.outputs.map((output) => output.name)).size).toBe(
      projection.outputs.length
    );
    expect(new Set(projection.outputs.map((output) => output.fieldId)).size).toBe(
      projection.outputs.length
    );
    projection.outputs.forEach((output) => expect(output.fieldId).toMatch(OPAQUE_FIELD_ID));
    expect(projection.outputs.some((output) => output.name.includes('right_table'))).toBe(true);
  });

  it('creates opaque COUNT and rank identities and preserves them through rename', () => {
    const draft = appendShipmentInput(fixture());
    const base = inspectNInput(draft);
    const grain = outputByName(base, 'shipment_id');

    const grouped = applyDvtSubstraitInnerJoinGrouping(draft, {
      groupFieldId: grain.fieldId,
      countOutputName: 'row_count',
    });
    const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(grouped);
    if (!grouping.ok) throw new Error('Expected JOIN grouping.');
    const countId = grouping.projection.measure.fieldId;
    expect(grouping.projection.groupField.fieldId).toBe(grain.fieldId);
    expect(countId).toMatch(OPAQUE_FIELD_ID);
    expect(countId).not.toBe(grain.fieldId);

    const renamedCount = renameDvtSubstraitInnerJoinCountOutput(grouped, 'orders_count');
    const renamedGrouping = inspectDvtSubstraitInnerJoinGroupingDraft(renamedCount);
    expect(renamedGrouping.ok && renamedGrouping.projection.measure.fieldId).toBe(countId);

    const ranked = applyDvtSubstraitInnerJoinGroupedRowNumber(renamedCount, {
      outputName: 'group_rank',
    });
    const window = inspectDvtSubstraitInnerJoinGroupedWindowDraft(ranked);
    if (!window.ok) throw new Error('Expected JOIN grouped window.');
    const rankId = window.projection.result.fieldId;
    expect(rankId).toMatch(OPAQUE_FIELD_ID);
    expect(rankId).not.toBe(countId);

    const renamedRank = renameDvtSubstraitInnerJoinGroupedRowNumberOutput(ranked, 'ranked_group');
    const renamedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(renamedRank);
    expect(renamedWindow.ok && renamedWindow.projection.result.fieldId).toBe(rankId);

    expect(
      inspectDvtSubstraitInnerJoinGroupingDraft(removeDvtSubstraitInnerJoinGroupedRowNumber(ranked))
        .ok
    ).toBe(true);
    expect(inspectDvtSubstraitNInputJoinDraft(removeDvtSubstraitInnerJoinGrouping(grouped)).ok).toBe(
      true
    );
  });

  it('does not reserve join-count names as semantic identities', () => {
    const draft = createDvtSubstraitStringInnerJoinDraft({
      left: {
        source: source('source-a', 'public', 'a'),
        fields: ['customer_id', 'join-count'],
      },
      right: {
        source: source('source-b', 'public', 'b'),
        fields: ['customer_id', 'join-count-rank'],
      },
      leftFieldName: 'customer_id',
      rightFieldName: 'customer_id',
      targetNodeId: 'transform-reserved-names',
    });
    const projection = inspectNInput(draft);

    expect(projection.outputs.map((output) => output.name)).toEqual(
      expect.arrayContaining(['join-count', 'join-count-rank'])
    );
    projection.outputs.forEach((output) => expect(output.fieldId).toMatch(OPAQUE_FIELD_ID));
  });

  it('keeps semantic plan determinism separate from fresh sidecar identity allocation', () => {
    const first = encodeDvtSubstraitInnerJoinDocument(fixture());
    const second = encodeDvtSubstraitInnerJoinDocument(fixture());

    expect(first.semanticPlan.sha256).toBe(second.semanticPlan.sha256);
    expect(first.sidecar.relations.map((relation) => relation.relationId)).not.toEqual(
      second.sidecar.relations.map((relation) => relation.relationId)
    );
    expect(first.sidecar.fields.map((field) => field.fieldId)).not.toEqual(
      second.sidecar.fields.map((field) => field.fieldId)
    );
  });

  it('preserves one persisted draft identity across encode and reload', () => {
    const draft = fixture();
    const document = encodeDvtSubstraitInnerJoinDocument(draft);
    const reloaded = decodeDvtSubstraitInnerJoinDocument(document);

    expect(reloaded.sidecar.relations).toEqual(document.sidecar.relations);
    expect(reloaded.sidecar.fields).toEqual(document.sidecar.fields);
    expect(inspectDvtSubstraitInnerJoinDraft(reloaded).ok).toBe(true);
  });

  it('accepts old-format persisted IDs as opaque values and preserves them through edit/reload', () => {
    const legacy = legacyBinaryDraft(fixture());
    const inspection = inspectDvtSubstraitInnerJoinDraft(legacy);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    const nameField = inspection.projection.outputs.find((output) => output.fieldKey === 'left.name');
    if (nameField == null) throw new Error('Expected legacy name output.');

    const renamed = applyDvtSubstraitInnerJoinFieldEdit(legacy, {
      kind: 'rename',
      fieldKey: 'left.name',
      outputName: 'customer_name',
    });
    const renamedInspection = inspectDvtSubstraitInnerJoinDraft(renamed);
    if (!renamedInspection.ok) throw new Error('Expected renamed legacy JOIN.');
    expect(
      renamedInspection.projection.outputs.find((output) => output.fieldKey === 'left.name')?.fieldId
    ).toBe(nameField.fieldId);

    const reloaded = decodeDvtSubstraitInnerJoinDocument(
      encodeDvtSubstraitInnerJoinDocument(renamed)
    );
    const reloadedInspection = inspectDvtSubstraitInnerJoinDraft(reloaded);
    if (!reloadedInspection.ok) throw new Error('Expected reloaded legacy JOIN.');
    expect(
      reloadedInspection.projection.outputs.find((output) => output.fieldKey === 'left.name')?.fieldId
    ).toBe(nameField.fieldId);
  });

  it('resolves semantic inputs back to graph sources by sourceRef and field closure', () => {
    const customers = canonicalSource('source-customers', 'customers', ['customer_id', 'name']);
    const orders = canonicalSource('source-orders', 'orders', ['order_id', 'customer_id']);
    const draft = fixture();
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-customer-orders',
        name: 'Customer orders',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: {},
      },
      encodeDvtSubstraitInnerJoinDocument(draft)
    );
    const edges: CanonicalEdge[] = [
      {
        id: 'customers-to-transform',
        sourceId: customers.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'orders-to-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    const entry = resolveDvtSubstraitNInputJoinEntry({
      targetNode: transform,
      nodes: [customers, orders, transform],
      edges,
    });

    expect(entry?.inputs.map((input) => input.source.nodeId)).toEqual([
      customers.id,
      orders.id,
    ]);
    expect(entry?.outputs.map((output) => output.fieldId)).toEqual(
      inspectNInput(draft).outputs.map((output) => output.fieldId)
    );
  });

  it('fails closed on incompatible sources, duplicate identity and stale hash', () => {
    expect(() =>
      createDvtSubstraitInnerJoinDraft({
        left: source('source-customers', 'public', 'customers', 'warehouse-a'),
        right: source('source-orders', 'public', 'orders', 'warehouse-b'),
        targetNodeId: 'transform-customer-orders',
      })
    ).toThrow();

    const draft = fixture();
    const duplicateField = {
      ...draft,
      sidecar: {
        ...draft.sidecar,
        fields: draft.sidecar.fields.map((field, index) =>
          index === 1 ? { ...field, fieldId: draft.sidecar.fields[0]!.fieldId } : field
        ),
      },
    };
    expect(inspectDvtSubstraitNInputJoinDraft(duplicateField).ok).toBe(false);

    const encoded = encodeDvtSubstraitInnerJoinDocument(draft);
    expect(() =>
      decodeDvtSubstraitInnerJoinDocument({
        ...encoded,
        sidecar: { ...encoded.sidecar, semanticPlanSha256: 'f'.repeat(64) },
      })
    ).toThrow();
  });
});
