/** Resolve a scoped tree reference into the existing canonical output-selection command. */
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';

export async function selectCanvasRelationalField(
  session: CanvasRelationAnalysisSession,
  reference: CanvasRelationalFieldReference,
  target: Readonly<{ kind: 'remove' } | { kind: 'add'; relationId: string }>,
  signal?: AbortSignal
) {
  signal?.throwIfAborted();
  if (reference.rootId !== session.rootId || reference.revision !== session.revision)
    throw new SubstraitAnalysisError(
      'stale_document',
      'Field belongs to another document revision.'
    );
  const source = await session.query(reference.relationId, signal);
  const field = source.bindings.find(
    (f) => f.fieldId === reference.fieldId && f.parentFieldId == null
  );
  if (field == null || !session.allowsInputSchema(source.fields[field.outputOrdinal]!))
    throw new SubstraitAnalysisError('invalid_binding', 'Field is not published.');
  if (target.kind === 'add' && target.relationId === reference.relationId) return null;
  const relationId = target.kind === 'remove' ? reference.relationId : target.relationId;
  const location = session.locate(relationId, reference.revision);
  if (
    location.relation.relType.case === 'read' ||
    (target.kind === 'remove' && reference.selectedOutput !== true) ||
    (target.kind === 'add' && !location.inputs.includes(reference.relationId))
  )
    throw new SubstraitAnalysisError('invalid_binding', 'Field is not admitted by this selection.');
  const inputs = await Promise.all(location.inputs.map((id) => session.query(id, signal)));
  const slots = relationOutputSlots(location, inputs);
  const selected = slots
    .filter((slot) => slot.output != null)
    .sort((a, b) => a.output!.outputOrdinal - b.output!.outputOrdinal);
  const slot =
    target.kind === 'remove'
      ? selected.find((entry) => entry.output!.fieldId === reference.fieldId)
      : slots.find((entry) => entry.fields[0]?.sourceFieldId === reference.fieldId);
  if (slot == null)
    throw new SubstraitAnalysisError('invalid_binding', 'Field is not an admitted direct output.');
  if (target.kind === 'add' && slot.output != null) return null;
  const outputs = (
    target.kind === 'remove' ? selected.filter((entry) => entry !== slot) : [...selected, slot]
  ).map((entry) => ({ slot: entry.slot, alias: entry.name }));
  return changeSelectedRelationOutputs(session, {
    relationId,
    expectedRevision: reference.revision,
    outputs,
    signal,
  });
}

/** User-facing dependency names; canonical mutation remains the authority for rejection. */
export function canvasRelationalFieldConsumers(
  session: CanvasRelationAnalysisSession,
  reference: CanvasRelationalFieldReference
): readonly string[] {
  if (reference.rootId !== session.rootId || reference.revision !== session.revision) return [];
  const source = session.locate(reference.relationId, reference.revision);
  return [
    ...new Set([
      ...session
        .referencingFields([reference.fieldId], reference.revision)
        .filter((field) => field.relationId !== reference.relationId)
        .map((field) => field.displayName)
        .filter((name): name is string => name != null),
      ...source.consumers.map((id) => {
        const consumer = session.locate(id, reference.revision);
        return consumer.binding.displayName ?? consumer.relation.relType.case ?? '';
      }),
    ]),
  ].filter(Boolean);
}
