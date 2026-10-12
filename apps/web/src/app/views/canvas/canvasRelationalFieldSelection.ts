/**
 * Owned concern: resolve scoped tree gestures into canonical output or definition commands.
 * @baseline ADR-0064: field provenance does not distinguish passthroughs from calculations.
 * @decision Resolve definition identity from emit mappings before selecting its mutation rail.
 * @consequence Removing a calculation cannot silently become hiding its public forwarding field.
 * @version 1.0.0
 */
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import {
  changeSelectedRelationOutputs,
  type RelationOutputEdit,
} from './canvasSelectedRelationOutputs';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';
import { removeCanvasTransformDefinition } from './removeCanvasTransformDefinition';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';
import { rootFields } from './canvasDerivedOutputExpression';

export async function readCanvasRelationalPublishedField(
  session: CanvasRelationAnalysisSession,
  reference: CanvasRelationalFieldReference,
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
  session.locate(reference.relationId, reference.revision);
  return field;
}

export async function selectCanvasRelationalField(
  session: CanvasRelationAnalysisSession,
  reference: CanvasRelationalFieldReference,
  target: Readonly<{ kind: 'remove' } | { kind: 'add'; relationId: string }>,
  signal?: AbortSignal
) {
  await readCanvasRelationalPublishedField(session, reference, signal);
  if (target.kind === 'add' && target.relationId === reference.relationId) return null;
  const relationId = target.kind === 'remove' ? reference.relationId : target.relationId;
  const location = session.locate(relationId, reference.revision);
  const model =
    location.relation.relType.case === 'project'
      ? readCanvasTransformDependencyModel(location, (id) => session.locate(id, reference.revision))
      : null;
  const inputIds = model == null ? location.inputs : [model.input.binding.relationId];
  if (
    location.relation.relType.case === 'read' ||
    (target.kind === 'remove' && reference.selectedOutput !== true) ||
    (target.kind === 'add' && !inputIds.includes(reference.relationId))
  )
    throw new SubstraitAnalysisError('invalid_binding', 'Field is not admitted by this selection.');
  if (target.kind === 'remove' && model != null) {
    const definition = model.definitions.find(
      (entry) => entry.output?.fieldId === reference.fieldId
    );
    if (definition != null)
      return removeCanvasTransformDefinition(session, {
        relationId,
        expectedRevision: reference.revision,
        definitionId: definition.id,
        signal,
      });
  }
  const inputs = await Promise.all(location.inputs.map((id) => session.query(id, signal)));
  const slots = relationOutputSlots(location, inputs);
  const selected = slots
    .filter((slot) => slot.output != null)
    .sort((a, b) => a.output!.outputOrdinal - b.output!.outputOrdinal);
  const inputSymbols =
    model?.memberOutputIds.get(location.inputs[0]!) ??
    (model == null ? [] : rootFields(model.input.fields).map((field) => field.fieldId));
  const slot =
    target.kind === 'remove'
      ? selected.find((entry) => entry.output!.fieldId === reference.fieldId)
      : model == null
        ? slots.find((entry) => entry.fields[0]?.sourceFieldId === reference.fieldId)
        : slots[inputSymbols.indexOf(reference.fieldId)];
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

/** Delete a complete Project definition, including its output, through the same atomic command. */
export async function removeCanvasRelationalExpression(
  session: CanvasRelationAnalysisSession,
  request: Omit<RelationOutputEdit, 'outputs' | 'removeExpressionOrdinal'> &
    Readonly<{ expressionOrdinal: number }>
) {
  request.signal?.throwIfAborted();
  const target = session.locate(request.relationId, request.expectedRevision);
  if (target.relation.relType.case !== 'project')
    throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
  const rootId = target.binding.authoringOwnerRelationId ?? request.relationId;
  const root = session.locate(rootId, request.expectedRevision);
  const model = readCanvasTransformDependencyModel(root, (id) =>
    session.locate(id, request.expectedRevision)
  );
  const definition = model.definitions.find(
    (entry) =>
      entry.owner.binding.relationId === request.relationId &&
      entry.ordinal === request.expressionOrdinal
  );
  if (definition == null)
    throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
  return removeCanvasTransformDefinition(session, {
    ...request,
    relationId: rootId,
    definitionId: definition.id,
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
