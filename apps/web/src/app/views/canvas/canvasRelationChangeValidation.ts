/** Validate only the changed path with cached sibling schemas before publishing a revision. */
import {
  deriveRelationSchema,
  readRelationStructure,
  type RelationChangeSet,
  type SchemaField,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

export async function validateRelationChanges(
  session: CanvasRelationAnalysisSession,
  change: RelationChangeSet,
  createdInputs: ReadonlyMap<string, readonly string[]>,
  signal?: AbortSignal
): Promise<void> {
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
    schemas.set(id, deriveRelationSchema({ ...entry, inputs: inputIds, consumers }, inputs));
    visited.add(id);
    pending.shift();
    pending.push(...consumers.filter((consumer) => !change.removed.includes(consumer)));
  }
}
