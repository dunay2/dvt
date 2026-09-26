/** One-way migration of an exact legacy embedded producer; never a runtime binding strategy. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, toBinary } from '@bufbuild/protobuf';
import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import { sha256Hex, jcsCanonicalize } from '@dvt/crypto';

import type { SubstraitDocument } from './document.js';
import { createProducerInput } from './producerInput.js';
import { indexSubstraitRelations } from './relationIndex.js';
import { withRelationInputs } from './relationMessage.js';

export function migrateEmbeddedProducerInput(
  consumer: SubstraitDocument,
  producer: Readonly<{ nodeId: string; name: string; document: SubstraitDocument }>
): SubstraitDocument {
  const before = indexSubstraitRelations(consumer);
  const upstream = indexSubstraitRelations(producer.document);
  if (!before.ok || !upstream.ok) return consumer;
  const rootId = upstream.index.rootId;
  const embedded = before.index.relations.get(rootId);
  const published = upstream.index.relations.get(rootId)!;
  if (embedded == null || embedded.binding.producerRef != null || rootId === before.index.rootId)
    return consumer;
  if (
    sha256Hex(toBinary(RelSchema, embedded.relation)) !==
    sha256Hex(toBinary(RelSchema, published.relation))
  )
    return consumer;
  if (
    [...upstream.index.relations].some(([id, entry]) => {
      const copy = before.index.relations.get(id);
      return (
        copy == null ||
        jcsCanonicalize(copy.binding) !== jcsCanonicalize(entry.binding) ||
        jcsCanonicalize(copy.fields) !== jcsCanonicalize(entry.fields)
      );
    })
  )
    return consumer;
  const replacement = createProducerInput(producer, embedded.binding.relAnchor);
  const nextInput = {
    ...replacement.binding,
    relationId: rootId,
    producerRef: {
      nodeId: producer.nodeId,
      fields: published.fields.map((field) => ({
        fieldId: field.fieldId,
        producerFieldId: field.fieldId,
      })),
    },
  };
  const replacementFields = published.fields.map(
    ({ sourceFieldId: _source, operandFieldIds: _operands, ...field }) => field
  );
  const included = new Set(upstream.index.relations.keys());
  const relations = new Map([[rootId, replacement.relation]]);
  for (const id of before.index.postorder) {
    if (included.has(id)) continue;
    const entry = before.index.relations.get(id)!;
    relations.set(
      id,
      withRelationInputs(
        entry.relation,
        entry.inputs.map((input) => relations.get(input)!)
      )
    );
  }
  const plan = clone(PlanSchema, consumer.plan);
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root') return consumer;
  root.value.input = relations.get(before.index.rootId)!;
  return {
    plan,
    sidecar: {
      ...consumer.sidecar,
      semanticPlanSha256: encodeDvtSubstraitPlanV1(plan).sha256,
      relations: [
        ...consumer.sidecar.relations.filter((binding) => !included.has(binding.relationId)),
        nextInput,
      ],
      fields: [
        ...consumer.sidecar.fields.filter((field) => !included.has(field.relationId)),
        ...replacementFields,
      ],
    },
  };
}
