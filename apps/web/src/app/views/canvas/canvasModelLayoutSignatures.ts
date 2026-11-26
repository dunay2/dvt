/** Compare canonical relation meaning for local layout only; never allocate or rewrite identities. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, toJson } from '@bufbuild/protobuf';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import {
  cloneLocalRelation,
  deriveSubstraitSchemas,
  readRelationStructure,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

export function canvasModelLayoutSignatures(
  document: SubstraitDocument
): ReadonlyMap<string, string> {
  const { index, schemas } = deriveSubstraitSchemas(document);
  const environment = toJson(PlanSchema, { ...document.plan, relations: [], version: undefined });
  const signatures = new Map<string, string>();
  for (const id of index.postorder) {
    const entry = index.relations.get(id)!;
    const local = cloneLocalRelation(
      entry.relation,
      entry.inputs.map(() => create(RelSchema))
    );
    const common = readRelationStructure(local).common;
    if (common != null) common.relAnchor = 0;
    signatures.set(
      id,
      sha256HexUtf8(
        jcsCanonicalize({
          environment,
          relation: toJson(RelSchema, local),
          source: entry.binding.sourceRef ?? null,
          producer: entry.binding.producerRef ?? null,
          fields: entry.fields.map((field, ordinal) => ({
            name: field.displayName ?? null,
            type: toJson(TypeSchema, schemas.get(id)![ordinal]!.type),
          })),
          inputs: entry.inputs.map((inputId) => signatures.get(inputId)!),
        })
      )
    );
  }
  return signatures;
}
