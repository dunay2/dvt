/** Reconnect one canonical consumer port; the operation command supplies its own semantic message. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  cloneLocalRelation,
  readRelationStructure,
  type RelationChangeSet,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

export function reconnectSelectedRelation(
  session: CanvasRelationAnalysisSession,
  targetId: string,
  replacement: Rel,
  replacementId: string,
  expectedRevision: number
): Pick<RelationChangeSet, 'rootId' | 'upserts'> {
  const target = session.locate(targetId, expectedRevision);
  const parentId = target.consumers[0];
  if (parentId == null) return { rootId: replacementId, upserts: [] };
  const parent = session.locate(parentId, expectedRevision);
  const inputs = readRelationStructure(parent.relation).inputs.map((input, ordinal) =>
    parent.inputs[ordinal] === targetId ? replacement : input
  );
  return {
    upserts: [
      {
        relation: cloneLocalRelation(parent.relation, inputs),
        binding: parent.binding,
        fields: parent.fields,
      },
    ],
  };
}

/** Rebind only fields that directly referenced removed passthrough outputs. */
export function rebindSelectedFieldReferences(
  session: CanvasRelationAnalysisSession,
  replacements: ReadonlyMap<string, string>,
  reconnected: RelationChangeSet['upserts'],
  expectedRevision: number
): RelationChangeSet['upserts'] {
  const affected = new Set(
    session
      .referencingFields([...replacements.keys()], expectedRevision)
      .filter((field) =>
        [field.sourceFieldId, ...(field.operandFieldIds ?? [])].some(
          (id) => id != null && replacements.has(id)
        )
      )
      .map((field) => field.relationId)
  );
  const changes = new Map(reconnected.map((entry) => [entry.binding.relationId, entry]));
  for (const relationId of affected) {
    const original = changes.get(relationId) ?? session.locate(relationId, expectedRevision);
    changes.set(relationId, {
      relation: original.relation,
      binding: original.binding,
      fields: original.fields.map((field) => ({
        ...field,
        ...(field.sourceFieldId == null
          ? {}
          : { sourceFieldId: replacements.get(field.sourceFieldId) ?? field.sourceFieldId }),
        ...(field.operandFieldIds == null
          ? {}
          : { operandFieldIds: field.operandFieldIds.map((id) => replacements.get(id) ?? id) }),
      })),
    });
  }
  return [...changes.values()];
}
