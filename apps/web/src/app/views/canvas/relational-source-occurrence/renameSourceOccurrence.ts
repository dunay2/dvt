/** Rename one canonical Read binding without changing its physical source or descendants. */
import { CanvasHumanNameV1Schema } from '@dvt/contracts';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';

export const parseOccurrenceAlias = (alias: string) => CanvasHumanNameV1Schema.safeParse(alias);

export async function renameSourceOccurrence(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    alias: string;
    signal?: AbortSignal;
  }>
) {
  request.signal?.throwIfAborted();
  const name = parseOccurrenceAlias(request.alias);
  if (!name.success) throw new SubstraitAnalysisError('invalid_binding', 'Invalid instance alias.');
  const selected = session.locate(request.relationId, request.expectedRevision);
  if (selected.relation.relType.case !== 'read' || selected.binding.sourceRef == null)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Alias target must be a source occurrence.'
    );
  return session.apply({
    expectedRevision: request.expectedRevision,
    upserts: [
      {
        relation: selected.relation,
        fields: [...selected.fields],
        binding: { ...selected.binding, displayName: name.data },
      },
    ],
    removed: [],
  });
}
