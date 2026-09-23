/** Derive an isolated query subtree by identity. Full serialization remains an explicit document boundary. */
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, toBinary } from '@bufbuild/protobuf';
import { DvtSubstraitAuthoringSidecarV1Schema } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import { indexSubstraitRelations } from './relationIndex.js';

export function selectDvtSubstraitRelation(
  document: SubstraitDocument,
  relationId: string
): SubstraitDocument {
  const inspection = indexSubstraitRelations(document);
  if (!inspection.ok) throw inspection.error;
  const { index } = inspection;
  const selected = index.relations.get(relationId);
  if (selected == null)
    throw new SubstraitAnalysisError(
      'unknown_relation',
      'The selected relation is outside the document.'
    );
  const expectedHash = document.sidecar.semanticPlanSha256;
  if (
    expectedHash !== '0'.repeat(64) &&
    expectedHash !== sha256Hex(toBinary(PlanSchema, document.plan))
  ) {
    throw new SubstraitAnalysisError('stale_document', 'The plan and sidecar revisions differ.');
  }
  const included = new Set<string>();
  const pending = [relationId];
  while (pending.length > 0) {
    const id = pending.pop()!;
    included.add(id);
    for (const input of index.relations.get(id)!.inputs) pending.push(input);
  }
  const names = selected.fields.map((field) => {
    if (field.displayName == null)
      throw new SubstraitAnalysisError('invalid_binding', 'A selected output name is absent.');
    return field.displayName;
  });
  // Replace before cloning: unrelated relation trees are never copied.
  const root = document.plan.relations[0]!;
  if (root.relType.case !== 'root')
    throw new SubstraitAnalysisError('invalid_structure', 'Expected root.');
  const plan = clone(PlanSchema, {
    ...document.plan,
    relations: [
      {
        ...root,
        relType: {
          case: 'root',
          value: { ...root.relType.value, input: selected.relation, names },
        },
      },
    ],
  });
  return {
    plan,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema.parse({
      ...document.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
      relations: document.sidecar.relations.filter((binding) => included.has(binding.relationId)),
      fields: document.sidecar.fields.filter((field) => included.has(field.relationId)),
    }),
  };
}
