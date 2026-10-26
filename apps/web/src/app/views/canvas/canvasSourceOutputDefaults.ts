/** Materialize per-occurrence intent through the canonical terminal Output command. */
import type { ConnectionRef } from '@dvt/contracts';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  readCanvasSourceOccurrenceOutputSelection,
  sourceOccurrenceOutputEdits,
} from './canvasSourceOccurrenceOutputSlots';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';

export async function initializeCanvasSourceOutputs(
  args: Readonly<{
    document: SubstraitDocument;
    sources: readonly PendingSourceOccurrence[];
    connection?: ConnectionRef;
    deniedInputs?: ReadonlySet<string>;
    disconnectedInputs?: ReadonlySet<string>;
    signal?: AbortSignal;
  }>
) {
  args.signal?.throwIfAborted();
  const index = indexSubstraitRelations(args.document);
  if (!index.ok) throw new Error('Invalid terminal Output document.');
  const sources = args.sources.filter(
    (source) =>
      source.initialOutputFieldIds != null &&
      index.index.relations.has(source.read.binding.relationId)
  );
  const session = new CanvasRelationAnalysisSession('pending-source-output', args.connection);
  session.receive(args.document, args.deniedInputs, args.disconnectedInputs);
  let document = args.document;
  try {
    for (const source of sources) {
      const selection = await readCanvasSourceOccurrenceOutputSelection(
        session,
        source.read.binding.relationId,
        session.revision,
        args.signal
      );
      const selectedIds = new Set(source.initialOutputFieldIds);
      const sourceSchema = await session.query(source.read.binding.relationId, args.signal);
      for (const id of selectedIds) {
        const field = source.read.fields.find(
          (candidate) => candidate.fieldId === id && candidate.parentFieldId == null
        );
        const schema = field == null ? undefined : sourceSchema.fields[field.outputOrdinal];
        if (schema == null || !session.allowsInputSchema(schema))
          throw new Error('Source Output publication is unavailable.');
      }
      if (
        selectedIds.size === selection.fields.length &&
        selection.fields.every((field) => selectedIds.has(field.id))
      )
        continue;
      if (
        !selection.fields.some((field) => field.slots.length > 0) ||
        [...selectedIds].some(
          (id) => !selection.fields.some((field) => field.id === id && field.available)
        )
      )
        throw new Error('Source Output has no independent direct contribution.');
      document = await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        signal: args.signal,
        outputs: sourceOccurrenceOutputEdits(
          selection,
          new Map(selection.fields.map((field) => [field.id, selectedIds.has(field.id)]))
        ),
      });
    }
    args.signal?.throwIfAborted();
    return { document, consumedIds: sources.map((source) => source.read.binding.relationId) };
  } finally {
    session.dispose();
  }
}
