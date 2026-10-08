/**
 * Owned concern: validate changed canonical paths before publishing a revision.
 * @baseline GH-3596: retained JOIN editing is not a general disconnected mutation permission.
 * @decision Recognize an exact root emit-only delta before applying retained-output eligibility.
 * @consequence Other operations keep the same mapped-Input validation and atomic rejection.
 * @version 1.1.0
 */
import { create, equals } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { jcsCanonicalize } from '@dvt/crypto';
import {
  cloneLocalRelation,
  deriveRelationSchema,
  readRelationStructure,
  type RelationChangeSet,
  type SchemaField,
  SubstraitAnalysisError,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

function isRetainedFinalJoinOutputEdit(
  session: CanvasRelationAnalysisSession,
  change: RelationChangeSet
): boolean {
  const edited = change.upserts[0];
  if (
    edited == null ||
    change.upserts.length !== 1 ||
    change.removed.length !== 0 ||
    change.extensions != null ||
    change.rootId !== session.rootId ||
    !session.canEditRetainedJoinOutput(edited.binding.relationId)
  )
    return false;
  const previous = session.locate(edited.binding.relationId, change.expectedRevision);
  if (jcsCanonicalize(edited.binding) !== jcsCanonicalize(previous.binding)) return false;
  const beforeInputs = readRelationStructure(previous.relation).inputs;
  const afterInputs = readRelationStructure(edited.relation).inputs;
  if (
    beforeInputs.length !== afterInputs.length ||
    beforeInputs.some((input, port) => input !== afterInputs[port])
  )
    return false;
  const blanks = beforeInputs.map(() => create(RelSchema));
  const before = cloneLocalRelation(previous.relation, blanks);
  const after = cloneLocalRelation(edited.relation, blanks);
  readRelationStructure(after).common!.emitKind = readRelationStructure(before).common!.emitKind;
  return equals(RelSchema, before, after);
}

export async function validateRelationChanges(
  session: CanvasRelationAnalysisSession,
  change: RelationChangeSet,
  createdInputs: ReadonlyMap<string, readonly string[]>,
  signal?: AbortSignal
): Promise<void> {
  const retainedOutputEdit = isRetainedFinalJoinOutputEdit(session, change);
  if (session.canEditRetainedJoinOutput(session.rootId) && !retainedOutputEdit)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Only retained final JOIN output selection is editable without mapped Input.'
    );
  const changed = new Map(change.upserts.map((entry) => [entry.binding.relationId, entry]));
  const anchors = new Map(
    change.upserts.map((entry) => [entry.binding.relAnchor, entry.binding.relationId])
  );
  const schemas = new Map<string, readonly SchemaField[]>();
  const pending = change.upserts.map((entry) => entry.binding.relationId);
  const visited = new Set<string>();
  while (pending.length > 0) {
    const id = pending[0]!;
    if (visited.has(id)) {
      pending.shift();
      continue;
    }
    const edited = changed.get(id);
    const previous = createdInputs.has(id) ? null : session.locate(id, change.expectedRevision);
    const relation = edited?.relation ?? previous!.relation;
    const inputIds = readRelationStructure(relation).inputs.map((input, port) => {
      const anchor = readRelationStructure(input).common?.relAnchor;
      return anchors.get(anchor!) ?? previous?.inputs[port] ?? createdInputs.get(id)![port]!;
    });
    const unfinished = inputIds.filter((input) => changed.has(input) && !schemas.has(input));
    if (unfinished.length > 0) {
      pending.unshift(...unfinished);
      continue;
    }
    const inputs = await Promise.all(
      inputIds.map(
        async (input) => schemas.get(input) ?? (await session.query(input, signal)).fields
      )
    );
    signal?.throwIfAborted();
    const consumers = previous?.consumers ?? [];
    const entry = edited ?? previous!;
    const derived = deriveRelationSchema({ ...entry, inputs: inputIds, consumers }, inputs);
    if (
      relation.relType.case !== 'read' &&
      derived.some(
        (field) =>
          !(retainedOutputEdit
            ? session.allowsOutputSchema(id, field)
            : session.allowsInputSchema(field))
      )
    )
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Operation references a field outside mapped Input.'
      );
    schemas.set(id, derived);
    visited.add(id);
    pending.shift();
    pending.push(...consumers.filter((consumer) => !change.removed.includes(consumer)));
  }
}
