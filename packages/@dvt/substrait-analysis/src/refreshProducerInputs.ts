/** Refresh referenced input schemas by identity; preserve consumers' own operators and outputs. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone } from '@bufbuild/protobuf';
import { encodeDvtSubstraitPlanV1, type DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import type { SubstraitDocument } from './document.js';
import { indexSubstraitRelations, type IndexedRelation } from './relationIndex.js';
import { rebaseRelationInput } from './relationInputRemap.js';
import { withRelationInputs } from './relationMessage.js';
import { deriveSubstraitSchemas } from './relationSchema.js';

type Fields = readonly DvtSubstraitFieldBindingV1[];
function names(fields: Fields, parent?: string): string[] {
  return fields
    .filter((field) => field.parentFieldId === parent)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
    .flatMap((field) => [field.displayName ?? field.fieldId, ...names(fields, field.fieldId)]);
}
function retain(fields: Fields, retained: readonly number[]): Fields {
  const roots = fields.filter((field) => field.parentFieldId == null);
  const ids = new Set(
    roots.filter((field) => retained.includes(field.outputOrdinal)).map((field) => field.fieldId)
  );
  for (const id of ids)
    for (const field of fields) if (field.parentFieldId === id) ids.add(field.fieldId);
  return fields
    .filter((field) => ids.has(field.fieldId))
    .map((field) => ({
      ...field,
      ...(field.parentFieldId == null
        ? { outputOrdinal: retained.indexOf(field.outputOrdinal) }
        : {}),
    }));
}
function refresh(entry: IndexedRelation, producer: SubstraitDocument): IndexedRelation {
  if (entry.relation.relType.case !== 'read') return entry;
  const analysis = deriveSubstraitSchemas(producer);
  const root = analysis.index.relations.get(analysis.index.rootId)!;
  const published = new Map(root.fields.map((field) => [field.fieldId, field]));
  const reference = entry.binding.producerRef!;
  const mappings = reference.fields.filter((mapping) => published.has(mapping.producerFieldId));
  const ids = new Map(mappings.map((mapping) => [mapping.producerFieldId, mapping.fieldId]));
  const roots = mappings.filter(
    (mapping) => published.get(mapping.producerFieldId)!.parentFieldId == null
  );
  const fields = mappings.map((mapping) => {
    const field = published.get(mapping.producerFieldId)!;
    return {
      fieldId: mapping.fieldId,
      relationId: entry.binding.relationId,
      outputOrdinal: field.parentFieldId == null ? roots.indexOf(mapping) : field.outputOrdinal,
      ...(field.displayName == null ? {} : { displayName: field.displayName }),
      ...(field.description == null ? {} : { description: field.description }),
      ...(field.parentFieldId == null ? {} : { parentFieldId: ids.get(field.parentFieldId)! }),
    };
  });
  const relation = clone(RelSchema, entry.relation);
  if (relation.relType.case !== 'read') return entry;
  const schema = relation.relType.value.baseSchema!;
  schema.names = names(fields);
  schema.struct!.types = roots.map(
    (mapping) =>
      analysis.schemas.get(root.binding.relationId)![
        published.get(mapping.producerFieldId)!.outputOrdinal
      ]!.type
  );
  const binding = { ...entry.binding, producerRef: { ...reference, fields: mappings } };
  if (
    jcsCanonicalize(fields) === jcsCanonicalize(entry.fields) &&
    jcsCanonicalize(schema) === jcsCanonicalize(entry.relation.relType.value.baseSchema)
  )
    return entry;
  return { ...entry, relation, binding, fields };
}

export function refreshProducerInputs(
  document: SubstraitDocument,
  producers: ReadonlyMap<string, SubstraitDocument>
): SubstraitDocument {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const entries = new Map<string, IndexedRelation>();
  for (const id of indexed.index.postorder) {
    const original = indexed.index.relations.get(id)!;
    const producerId = original.binding.producerRef?.nodeId;
    if (producerId != null) {
      const producer = producers.get(producerId);
      if (producer == null) throw new Error('Producer input is outside the authorized closure.');
      entries.set(id, refresh(original, producer));
      continue;
    }
    const inputs = original.inputs.map((input) => entries.get(input)!);
    if (inputs.every((input) => input === indexed.index.relations.get(input.binding.relationId))) {
      entries.set(id, original);
      continue;
    }
    const before = original.inputs.map((input) => indexed.index.relations.get(input)!.fields);
    const after = inputs.map((input) => input.fields);
    const retained: number[] = [];
    const changed = before.some(
      (fields, port) => jcsCanonicalize(fields) !== jcsCanonicalize(after[port])
    );
    const relation = changed
      ? rebaseRelationInput(
          original.relation,
          inputs.map((input) => input.relation),
          before,
          after,
          retained
        )
      : withRelationInputs(
          original.relation,
          inputs.map((input) => input.relation)
        );
    const variant = relation.relType.case;
    const fields =
      !changed || variant === 'aggregate' || variant === 'set'
        ? original.fields
        : retain(original.fields, retained);
    entries.set(id, { ...original, relation, fields });
  }
  const root = entries.get(indexed.index.rootId)!;
  if (root === indexed.index.relations.get(indexed.index.rootId)) return document;
  const plan = clone(PlanSchema, document.plan);
  const planRoot = plan.relations[0]!.relType;
  if (planRoot.case !== 'root') throw new Error('Expected canonical root.');
  planRoot.value.input = root.relation;
  planRoot.value.names = names(root.fields);
  const next = {
    plan,
    sidecar: {
      ...document.sidecar,
      semanticPlanSha256: encodeDvtSubstraitPlanV1(plan).sha256,
      relations: [...entries.values()].map((entry) => entry.binding),
      fields: [...entries.values()].flatMap((entry) => entry.fields),
    },
  };
  deriveSubstraitSchemas(next);
  return next;
}
