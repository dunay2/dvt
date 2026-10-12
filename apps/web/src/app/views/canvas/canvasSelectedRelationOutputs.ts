/**
 * Owned concern: apply canonical output selection without rewriting the input subtree.
 * @baseline GH-3596: retained final JOIN emits remain editable after disconnection.
 * @decision Reuse session output eligibility and the shared exact-delta commit validator.
 * @consequence This command does not grant formula, Source or publication permissions.
 * @version 1.1.0
 */
import { allocateDvtFieldId, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import {
  cloneLocalRelation,
  readRelationStructure,
  SubstraitAnalysisError,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';

export type RelationOutputEdit = Readonly<{
  relationId: string;
  expectedRevision: number;
  signal?: AbortSignal;
  outputs: readonly Readonly<{ slot: number; alias?: string }>[];
  removeExpressionOrdinal?: number;
}>;

export async function changeSelectedRelationOutputs(
  session: CanvasRelationAnalysisSession,
  request: RelationOutputEdit
) {
  request.signal?.throwIfAborted();
  const target = session.locate(request.relationId, request.expectedRevision);
  if (target.relation.relType.case === 'read')
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Physical source selection belongs in a projection.'
    );
  const inputs = await Promise.all(target.inputs.map((id) => session.query(id, request.signal)));
  const slots = relationOutputSlots(target, inputs);
  const selected = request.outputs.map(({ slot, alias }) => {
    const available = slots[slot];
    if (available == null)
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Output slot is outside the selected relation.'
      );
    if (!session.allowsOutputSchema(request.relationId, available.schema))
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Output references a field outside mapped Input.'
      );
    return { ...available, name: DvtSemanticFieldNameV1Schema.parse(alias ?? available.name) };
  });
  if (
    new Set(selected.map((entry) => entry.slot)).size !== selected.length ||
    new Set(selected.map((entry) => entry.name)).size !== selected.length
  )
    throw new SubstraitAnalysisError('invalid_binding', 'Output slots and aliases must be unique.');
  const relation = cloneLocalRelation(
    target.relation,
    readRelationStructure(target.relation).inputs
  );
  const common = readRelationStructure(relation).common!;
  let mapping = selected.map((entry) => entry.slot);
  if (request.removeExpressionOrdinal != null) {
    const ordinal = request.removeExpressionOrdinal;
    const inputCount = inputs.reduce((count, input) => count + input.fields.length, 0);
    const removedSlot = inputCount + ordinal;
    if (
      relation.relType.case !== 'project' ||
      !Number.isInteger(ordinal) ||
      ordinal < 0 ||
      ordinal >= relation.relType.value.expressions.length ||
      mapping.includes(removedSlot)
    )
      throw new SubstraitAnalysisError('invalid_binding', 'Expression removal is not admitted.');
    relation.relType.value.expressions.splice(ordinal, 1);
    mapping = mapping.map((slot) => (slot > removedSlot ? slot - 1 : slot));
  }
  common.emitKind = {
    case: 'emit',
    value: {
      $typeName: 'substrait.RelCommon.Emit',
      outputMapping: mapping,
    },
  };
  const retainedIds = new Set(
    selected.flatMap((entry) => (entry.output == null ? [] : [entry.output.fieldId]))
  );
  for (const id of retainedIds)
    for (const field of target.fields.filter((candidate) => candidate.parentFieldId === id))
      retainedIds.add(field.fieldId);
  const removedIds = new Set(
    target.fields.filter((field) => !retainedIds.has(field.fieldId)).map((field) => field.fieldId)
  );
  const fieldsById = new Map(target.fields.map((field) => [field.fieldId, field]));
  const fields = selected.flatMap((entry, outputOrdinal) => {
    if (entry.output != null) {
      const retained = new Set([entry.output.fieldId]);
      for (const id of retained)
        for (const child of target.fields.filter((field) => field.parentFieldId === id))
          retained.add(child.fieldId);
      const canonicalIds = new Map([[entry.output.fieldId, entry.key]]);
      return [...retained]
        .map((id) => fieldsById.get(id)!)
        .map((field) => {
          const canonical =
            field.parentFieldId == null
              ? entry.fields[0]
              : entry.fields.find(
                  (candidate) =>
                    candidate.parentFieldId === canonicalIds.get(field.parentFieldId!) &&
                    candidate.outputOrdinal === field.outputOrdinal
                );
          if (canonical != null) canonicalIds.set(field.fieldId, canonical.fieldId);
          const references = [field.sourceFieldId, ...(field.operandFieldIds ?? [])];
          const { sourceFieldId, operandFieldIds, ...identity } = field;
          const lineage = references.some((id) => id != null && removedIds.has(id))
            ? canonical
            : field;
          return {
            ...identity,
            ...(lineage?.sourceFieldId == null ? {} : { sourceFieldId: lineage.sourceFieldId }),
            ...(lineage?.operandFieldIds == null
              ? {}
              : { operandFieldIds: lineage.operandFieldIds }),
            ...(field.parentFieldId == null ? { displayName: entry.name, outputOrdinal } : {}),
          };
        });
    }
    const ids = new Map(entry.fields.map((field) => [field.fieldId, allocateDvtFieldId()]));
    return entry.fields.map((field) => ({
      ...field,
      fieldId: ids.get(field.fieldId)!,
      ...(field.parentFieldId == null
        ? { outputOrdinal, displayName: entry.name }
        : { parentFieldId: ids.get(field.parentFieldId)! }),
    }));
  });
  return commitSelectedRelation(session, {
    ...request,
    intent: 'edit',
    replacement: { relation, binding: target.binding, fields },
  });
}
