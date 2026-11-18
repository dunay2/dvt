/**
 * Owned concern: Copy canonical semantics with independent local sidecar identities.
 * Reason to change: Sidecar identity and lineage rules change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Reidentify local producer field bindings and preserve external producer identities.
 * @consequence Canonical Plan bytes remain exact and the copied document revalidates.
 * @version 1.0.0
 */
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

export function copyCanvasSemanticDocument(
  source: DvtSubstraitSemanticDocumentV1
): DvtSubstraitSemanticDocumentV1 {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(source);
  const relations = new Map(
    document.sidecar.relations.map((binding) => [binding.relationId, allocateDvtRelationId()])
  );
  const fields = new Map(
    document.sidecar.fields.map((binding) => [binding.fieldId, allocateDvtFieldId()])
  );
  const local = (map: ReadonlyMap<string, string>, id: string): string => {
    const replacement = map.get(id);
    if (replacement == null) throw new Error('Missing local semantic identity.');
    return replacement;
  };
  return canonicalizeDvtSubstraitSemanticDocumentV1({
    ...document,
    sidecar: {
      ...document.sidecar,
      relations: document.sidecar.relations.map((binding) => ({
        ...binding,
        relationId: local(relations, binding.relationId),
        ...(binding.authoringOwnerRelationId == null
          ? {}
          : { authoringOwnerRelationId: local(relations, binding.authoringOwnerRelationId) }),
        ...(binding.producerRef == null
          ? {}
          : {
              producerRef: {
                ...binding.producerRef,
                fields: binding.producerRef.fields.map((field) => ({
                  ...field,
                  fieldId: local(fields, field.fieldId),
                })),
              },
            }),
      })),
      fields: document.sidecar.fields.map((field) => ({
        ...field,
        fieldId: local(fields, field.fieldId),
        relationId: local(relations, field.relationId),
        ...(field.sourceFieldId == null
          ? {}
          : { sourceFieldId: local(fields, field.sourceFieldId) }),
        ...(field.parentFieldId == null
          ? {}
          : { parentFieldId: local(fields, field.parentFieldId) }),
        ...(field.operandFieldIds == null
          ? {}
          : { operandFieldIds: field.operandFieldIds.map((id) => local(fields, id)) }),
      })),
    },
  });
}
