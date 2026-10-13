/**
 * Owned concern: prove exact producer identity repair without semantic reconstruction.
 * @baseline ADR-0064 / GH-3628: names and ordinals are not replacement authority.
 * @decision Exercise retained schemas, complete field trees and strict core resolution.
 * @consequence Rejections leave both documents unchanged and partial repair is not executable.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  createProducerInput,
  deriveSubstraitSchemas,
  resolveProducerDocuments,
  resolveProducerInput,
  SubstraitAnalysisError,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { createSourceDocument } from './canvasSourceDocument';
import { SOURCE } from './canvasOutputProjection.test-support';
import { repairCanvasProducerInput } from './canvasProducerInputRepair';

function publication(prefix: string, nested = false): SubstraitDocument {
  const document = createDvtSubstraitProjectionDraft({
    source: {
      ...resolveDvtSubstraitProjectionSource(SOURCE)!,
      fields: [
        { name: 'order_id', dataType: 'bigint' },
        { name: 'customer', dataType: 'text' },
      ],
    },
    targetNodeId: 'producer',
    outputs: ['order_id', 'customer'].map((name) => ({
      fieldId: `${prefix}:${name}`,
      name,
      sourceFieldName: name,
    })),
  });
  return nested
    ? composeDvtSubstraitProjectionFields(document, {
        draggedFieldId: `${prefix}:customer`,
        targetFieldId: `${prefix}:order_id`,
        parentFieldId: `${prefix}:identity`,
        parentName: 'identity',
      })
    : document;
}

function fixture(
  nested = false
): Readonly<{ producer: SubstraitDocument; document: SubstraitDocument }> {
  const producer = publication('new', nested);
  const input = createProducerInput(
    { nodeId: 'producer', name: 'Producer', document: publication('old', nested) },
    1
  );
  const document = createSourceDocument([input], input);
  return { producer, document };
}

function repair(
  document: SubstraitDocument,
  producerDocument: SubstraitDocument,
  name = 'order_id'
): SubstraitDocument {
  return repairCanvasProducerInput(document, {
    producerNodeId: 'producer',
    previousFieldId: `old:${name}`,
    replacementFieldId: `new:${name}`,
    producerDocument,
  });
}

describe('retained producer Input repair', () => {
  it('preserves all consumer identities and remains unavailable until every reference is repaired', () => {
    const { producer, document } = fixture();
    const before = structuredClone(document);
    const partial = repair(document, producer);
    expect(partial.plan).toBe(document.plan);
    expect(partial.sidecar.fields).toBe(document.sidecar.fields);
    const partialIndex = deriveSubstraitSchemas(partial).index;
    expect(() =>
      resolveProducerInput(partialIndex.relations.get(partialIndex.rootId)!, producer)
    ).toThrow(SubstraitAnalysisError);
    const complete = repair(partial, producer, 'customer');
    const resolved = resolveProducerDocuments(
      'consumer',
      new Map([
        ['consumer', complete],
        ['producer', producer],
      ])
    ).get('consumer')!;
    expect(deriveSubstraitSchemas(resolved).index.rootId).toBe(
      deriveSubstraitSchemas(document).index.rootId
    );
    expect(resolved.sidecar.fields.map((field) => field.fieldId)).toEqual(
      document.sidecar.fields.map((field) => field.fieldId)
    );
    expect(document).toEqual(before);
  });

  it('maps complete nested hierarchies by the explicitly selected root and exact child paths', () => {
    const { producer, document } = fixture(true);
    const next = repair(document, producer, 'identity');
    const reference = next.sidecar.relations[0]!.producerRef!;
    const root = deriveSubstraitSchemas(producer).index;
    expect(reference.fields.map((field) => field.fieldId)).toEqual(
      document.sidecar.relations[0]!.producerRef!.fields.map((field) => field.fieldId)
    );
    const expectedTree = root.relations
      .get(root.rootId)!
      .fields.filter(
        (field) => field.fieldId === 'new:identity' || field.parentFieldId === 'new:identity'
      );
    expect(
      reference.fields
        .filter((field) => field.producerFieldId.startsWith('new:'))
        .map((field) => field.producerFieldId)
    ).toEqual(expectedTree.map((field) => field.fieldId));
    const complete = repair(repair(next, producer), producer, 'customer');
    const completeIndex = deriveSubstraitSchemas(complete).index;
    expect(() =>
      resolveProducerInput(completeIndex.relations.get(completeIndex.rootId)!, producer)
    ).not.toThrow();
    expect(next.plan).toBe(document.plan);
    expect(next.sidecar.fields).toBe(document.sidecar.fields);
  });

  it.each(['type', 'nullability', 'missing', 'foreign', 'available', 'duplicate', 'malformed'])(
    'rejects %s without changing retained authority',
    (scenario) => {
      const { producer, document } = fixture();
      const before = structuredClone(document);
      let producerNodeId = 'producer';
      let replacementFieldId = 'new:order_id';
      let previousFieldId = 'old:order_id';
      if (scenario === 'type') replacementFieldId = 'new:customer';
      if (scenario === 'missing') replacementFieldId = 'absent';
      if (scenario === 'foreign') producerNodeId = 'other';
      if (scenario === 'available') previousFieldId = 'new:order_id';
      if (scenario === 'duplicate')
        document.sidecar.relations[0]!.producerRef!.fields[1]!.producerFieldId = replacementFieldId;
      if (scenario === 'malformed') document.sidecar.relations[0]!.relAnchor = 9876;
      if (scenario === 'nullability') {
        const root = producer.plan.relations[0]!.relType;
        if (
          root.case !== 'root' ||
          root.value.input?.relType.case !== 'project' ||
          root.value.input.relType.value.input?.relType.case !== 'read'
        )
          throw new Error('Expected producer projection');
        const type =
          root.value.input.relType.value.input.relType.value.baseSchema!.struct!.types[0]!.kind;
        if (type.value == null || !('nullability' in type.value))
          throw new Error('Expected nullable type');
        type.value.nullability =
          type.value.nullability === Type_Nullability.NULLABLE
            ? Type_Nullability.REQUIRED
            : Type_Nullability.NULLABLE;
      }
      const retained = structuredClone(document);
      expect(() =>
        repairCanvasProducerInput(document, {
          producerNodeId,
          previousFieldId,
          replacementFieldId,
          producerDocument: producer,
        })
      ).toThrow(SubstraitAnalysisError);
      expect(document).toEqual(retained);
      if (scenario !== 'duplicate' && scenario !== 'malformed') expect(document).toEqual(before);
    }
  );

  it('rejects an orphaned nested replacement instead of partially remapping it', () => {
    const { producer, document } = fixture(true);
    const root = deriveSubstraitSchemas(producer).index;
    const children = root.relations
      .get(root.rootId)!
      .fields.filter((field) => field.parentFieldId != null);
    producer.sidecar.fields = producer.sidecar.fields.filter(
      (field) => field.fieldId !== children[0]!.fieldId
    );
    const before = structuredClone(document);
    expect(() => repair(document, producer, 'identity')).toThrow(SubstraitAnalysisError);
    expect(document).toEqual(before);
  });
});
