/**
 * Owned concern: explicitly rebind a missing producer publication without rewriting consumer semantics.
 * @baseline ADR-0064 / GH-3628: consumer FieldIds survive explicit Input repair.
 * @decision Validate retained types through the core producer boundary and map complete field trees.
 * @consequence Missing, incompatible or ambiguous replacements reject before any aggregate mutation.
 * @version 1.0.0
 */
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import {
  deriveSubstraitSchemas,
  resolveProducerInput,
  SubstraitAnalysisError,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

type Fields = readonly DvtSubstraitFieldBindingV1[];
function reject(message: string): never {
  throw new SubstraitAnalysisError('invalid_binding', message);
}

function fieldTreeMapping(
  local: DvtSubstraitFieldBindingV1,
  replacement: DvtSubstraitFieldBindingV1,
  localFields: Fields,
  published: Fields
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  const pending: Array<readonly [DvtSubstraitFieldBindingV1, DvtSubstraitFieldBindingV1]> = [
    [local, replacement],
  ];
  while (pending.length > 0) {
    const [before, after] = pending.pop()!;
    result.set(before.fieldId, after.fieldId);
    const children = localFields.filter((field) => field.parentFieldId === before.fieldId);
    const next = published.filter((field) => field.parentFieldId === after.fieldId);
    if (children.length !== next.length) reject('Replacement field hierarchy does not match.');
    for (const child of children) {
      const match = next.find((field) => field.outputOrdinal === child.outputOrdinal);
      if (match == null) reject('Replacement field hierarchy is incomplete.');
      pending.push([child, match]);
    }
  }
  return result;
}

export function repairCanvasProducerInput(
  document: SubstraitDocument,
  request: Readonly<{
    producerNodeId: string;
    previousFieldId: string;
    replacementFieldId: string;
    producerDocument: SubstraitDocument;
  }>
): SubstraitDocument {
  const { index } = deriveSubstraitSchemas(document);
  const producer = deriveSubstraitSchemas(request.producerDocument);
  const published = producer.index.relations.get(producer.index.rootId)!.fields;
  const replacement = published.find((field) => field.fieldId === request.replacementFieldId);
  if (published.some((field) => field.fieldId === request.previousFieldId))
    reject('Only a missing producer publication may be repaired.');
  if (replacement == null || replacement.parentFieldId != null)
    reject('Replacement must be a published root field.');
  let repaired = false;
  const relations = document.sidecar.relations.map((binding) => {
    const reference = binding.producerRef;
    if (reference?.nodeId !== request.producerNodeId) return binding;
    const previous = reference.fields.find(
      (field) => field.producerFieldId === request.previousFieldId
    );
    if (previous == null) return binding;
    const entry = index.relations.get(binding.relationId)!;
    const local = entry.fields.find((field) => field.fieldId === previous.fieldId);
    if (local == null || local.parentFieldId != null) reject('Retained Input root is unavailable.');
    const replacements = fieldTreeMapping(local, replacement, entry.fields, published);
    const replacementIds = new Set(replacements.values());
    if (
      reference.fields.some(
        (field) => !replacements.has(field.fieldId) && replacementIds.has(field.producerFieldId)
      )
    )
      reject('Replacement is already consumed by another Input field.');
    const fields = reference.fields.map((field) => ({
      ...field,
      producerFieldId: replacements.get(field.fieldId) ?? field.producerFieldId,
    }));
    const next = { ...binding, producerRef: { ...reference, fields } };
    const available = new Set(published.map((field) => field.fieldId));
    resolveProducerInput(
      {
        ...entry,
        binding: {
          ...next,
          producerRef: {
            ...next.producerRef,
            fields: fields.filter((field) => available.has(field.producerFieldId)),
          },
        },
      },
      request.producerDocument
    );
    repaired = true;
    return next;
  });
  if (!repaired) reject('Missing producer Input identity is outside this document.');
  return { ...document, sidecar: { ...document.sidecar, relations } };
}
