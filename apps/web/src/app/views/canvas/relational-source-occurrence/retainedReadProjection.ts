/** Owned concern: retain one JOIN Read as a projection without changing its identity or schema. */
import type {
  DvtSubstraitJoinDraft,
  DvtSubstraitNInputJoinProjection,
} from '@dvt/postgres-projection';
import { createDvtSubstraitProjectionDraft } from '../canvasDvtSubstraitProjection';
import { createProjectionType } from '../canvasDvtSubstraitProjectionStructure';

export function retainCanvasJoinReadProjection(
  args: Readonly<{
    original: DvtSubstraitJoinDraft;
    input: DvtSubstraitNInputJoinProjection['inputs'][number];
    outputs: DvtSubstraitNInputJoinProjection['outputs'];
    targetNodeId: string;
  }>
): DvtSubstraitJoinDraft | null {
  const { input } = args;
  // The current projection profile admits nullable fields only; never widen a required Read.
  if (
    input.fields.some(
      (field) =>
        !field.nullable || createProjectionType(field.dataType).kind.case !== field.dataType
    )
  )
    return null;
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      ...input,
      nodeId: input.relationId,
      fields: input.fields.map((field) => ({ name: field.name, dataType: field.dataType })),
    },
    targetNodeId: args.targetNodeId,
    outputs: args.outputs.map((field) => ({
      fieldId: field.fieldId,
      name: field.name,
      sourceFieldName: field.source.name,
    })),
  });
  const allocatedSourceId = draft.sidecar.relations[0]!.relationId;
  const prior = args.original.sidecar.relations.find(
    (relation) => relation.relationId === input.relationId
  );
  if (prior == null) return null;
  const fieldIds = new Map(
    draft.sidecar.fields
      .filter((field) => field.relationId === allocatedSourceId)
      .map((field) => [
        field.fieldId,
        input.fields.find((original) => original.name === field.displayName)!.fieldId,
      ])
  );
  return {
    ...draft,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.map((relation) =>
        relation.relationId === allocatedSourceId
          ? { ...prior, relAnchor: relation.relAnchor }
          : relation
      ),
      fields: draft.sidecar.fields.map((field) => ({
        ...field,
        fieldId: fieldIds.get(field.fieldId) ?? field.fieldId,
        relationId: field.relationId === allocatedSourceId ? input.relationId : field.relationId,
        ...(field.sourceFieldId == null
          ? {}
          : { sourceFieldId: fieldIds.get(field.sourceFieldId) ?? field.sourceFieldId }),
      })),
    },
  };
}
