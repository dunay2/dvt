/** Preserve published output identities only through unique direct canonical values. */
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { toJson } from '@bufbuild/protobuf';
import { allocateDvtFieldId } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { deriveSubstraitSchemas, type SubstraitDocument } from '@dvt/substrait-analysis';

import { checkedSourceAnalysis, directReadOrigin } from './provenance.js';

export function preserveSqlOutputIdentity(
  document: SubstraitDocument,
  current?: SubstraitDocument | null
): SubstraitDocument {
  if (current == null) return document;
  const old = checkedSourceAnalysis(current);
  const next = deriveSubstraitSchemas(document);
  const key = (analysis: typeof next, ordinal: number): string | null => {
    const origin = directReadOrigin(analysis, analysis.index.rootId, ordinal);
    const type = analysis.schemas.get(analysis.index.rootId)?.[ordinal]?.type;
    return origin == null || type == null
      ? null
      : jcsCanonicalize([origin, toJson(TypeSchema, type)]);
  };
  const oldIds = new Map<string, string | null>();
  for (const field of old.index.relations.get(old.index.rootId)!.fields) {
    const identity = key(old, field.outputOrdinal);
    if (identity != null) oldIds.set(identity, oldIds.has(identity) ? null : field.fieldId);
  }
  const rootFields = next.index.relations.get(next.index.rootId)!.fields;
  const counts = new Map<string, number>();
  for (const field of rootFields) {
    const identity = key(next, field.outputOrdinal);
    if (identity != null) counts.set(identity, (counts.get(identity) ?? 0) + 1);
  }
  const replacements = new Map<string, string>();
  for (const field of rootFields) {
    const identity = key(next, field.outputOrdinal);
    const target = identity == null || counts.get(identity) !== 1 ? null : oldIds.get(identity);
    if (target == null || target === field.fieldId) continue;
    if (next.index.fields.has(target)) replacements.set(target, allocateDvtFieldId());
    replacements.set(field.fieldId, target);
  }
  const local = (id: string): string => replacements.get(id) ?? id;
  return {
    ...document,
    sidecar: {
      ...document.sidecar,
      fields: document.sidecar.fields.map((field) => ({
        ...field,
        fieldId: local(field.fieldId),
        ...(field.sourceFieldId == null ? {} : { sourceFieldId: local(field.sourceFieldId) }),
        ...(field.parentFieldId == null ? {} : { parentFieldId: local(field.parentFieldId) }),
        ...(field.operandFieldIds == null
          ? {}
          : { operandFieldIds: field.operandFieldIds.map(local) }),
      })),
      relations: document.sidecar.relations.map((binding) =>
        binding.producerRef == null
          ? binding
          : {
              ...binding,
              producerRef: {
                ...binding.producerRef,
                fields: binding.producerRef.fields.map((field) => ({
                  ...field,
                  fieldId: local(field.fieldId),
                })),
              },
            }
      ),
    },
  };
}
