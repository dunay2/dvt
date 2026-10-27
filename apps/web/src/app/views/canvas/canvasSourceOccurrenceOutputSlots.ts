/**
 * Read an occurrence's direct contribution to root Output from canonical emit mappings.
 * Calculated dependencies and shared SET outputs are not direct forwarding.
 */
import { deriveOperatorSchema, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { relationOutputMapping } from './canvasRelationOutputBindings';
import { rootFields } from './canvasDerivedOutputExpression';
import { joinOutputScope } from './canvasSelectedJoinType';

/** Assemble direct inclusion deltas without replacing partially selected identity-copy slots. */
export function sourceOccurrenceOutputEdits(
  selection: Awaited<ReturnType<typeof readCanvasSourceOccurrenceOutputSelection>>,
  changes: ReadonlyMap<string, boolean>
) {
  const slotsFor = (included: boolean) =>
    new Set(
      selection.fields
        .filter((field) => changes.get(field.id) === included)
        .flatMap((field) => field.slots)
    );
  const removed = slotsFor(false);
  const added = slotsFor(true);
  return [
    ...selection.slots
      .filter((slot) => slot.output != null && !removed.has(slot.slot))
      .sort((left, right) => left.output!.outputOrdinal - right.output!.outputOrdinal),
    ...selection.slots.filter((slot) => slot.output == null && added.has(slot.slot)),
  ].map((slot) => ({ slot: slot.slot, alias: slot.name }));
}

export async function readCanvasSourceOccurrenceOutputSelection(
  session: CanvasRelationAnalysisSession,
  relationId: string,
  expectedRevision: number,
  signal?: AbortSignal
) {
  const source = session.locate(relationId, expectedRevision);
  if (source.relation.relType.case !== 'read')
    throw new SubstraitAnalysisError('invalid_binding', 'Expected a Source occurrence.');
  const sourceTypes = source.relation.relType.value.baseSchema?.struct?.types;
  const cache = new Map<string, Promise<readonly (string | null)[]>>();
  const naturalOrigins = async (id: string): Promise<readonly (string | null)[]> => {
    signal?.throwIfAborted();
    const entry = session.locate(id, expectedRevision);
    const variant = entry.relation.relType;
    if (variant.case === 'read') return rootFields(entry.fields).map((field) => field.fieldId);
    const inputs = await Promise.all(entry.inputs.map(selectedOrigins));
    if (variant.case === 'join') {
      const fields = inputs.flat();
      return joinOutputScope(
        variant.value.type,
        inputs.map((fields) => fields.length)
      ).map((slot) => fields[slot] ?? null);
    }
    if (variant.case === 'cross') return inputs.flat();
    if (variant.case === 'filter' || variant.case === 'sort' || variant.case === 'fetch')
      return inputs[0]!;
    if (variant.case === 'project')
      return [...inputs[0]!, ...variant.value.expressions.map(() => null)];
    const schemas = await Promise.all(entry.inputs.map((input) => session.query(input, signal)));
    return deriveOperatorSchema(
      entry,
      schemas.map((input) => input.fields)
    ).map(() => null);
  };
  const selectedOrigins = (id: string): Promise<readonly (string | null)[]> => {
    let pending = cache.get(id);
    if (pending == null) {
      pending = naturalOrigins(id).then((origins) => {
        const entry = session.locate(id, expectedRevision);
        return relationOutputMapping(entry.relation, origins.length).map(
          (slot) => origins[slot] ?? null
        );
      });
      cache.set(id, pending);
    }
    return pending;
  };
  const root = session.locate(session.rootId, expectedRevision);
  const [origins, inputs] = await Promise.all([
    naturalOrigins(session.rootId),
    Promise.all(root.inputs.map((id) => session.query(id, signal))),
  ]);
  const slots = relationOutputSlots(root, inputs);
  session.locate(relationId, expectedRevision);
  return {
    slots,
    fields: rootFields(source.fields).map((field) => {
      const contributions = slots.filter((slot) => origins[slot.slot] === field.fieldId);
      return {
        id: field.fieldId,
        name: field.displayName ?? field.fieldId,
        dataType: sourceTypes?.[field.outputOrdinal]?.kind.case,
        slots: contributions.map((slot) => slot.slot),
        included: contributions.some((slot) => slot.output != null),
        canRecoverInput: root.relation.relType.case !== 'read' && contributions.length > 0,
        available:
          root.relation.relType.case !== 'read' &&
          contributions.length > 0 &&
          contributions.every((slot) => session.allowsOutputSchema(session.rootId, slot.schema)),
      };
    }),
  };
}
