/** Identity, not operand side or relation shape, determines which instance is renamed. */
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas, indexSubstraitRelations } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import { applySelectedRelationSortFetch } from '../canvasSelectedRelationSortFetch';
import { repeatedOccurrenceDraft } from './occurrence.test.fixtures';
import { renameSourceOccurrence } from './renameSourceOccurrence';

function setup(): {
  document: ReturnType<typeof repeatedOccurrenceDraft>;
  session: CanvasRelationAnalysisSession;
  reads: ReturnType<typeof repeatedOccurrenceDraft>['sidecar']['relations'];
} {
  const document = repeatedOccurrenceDraft();
  const session = new CanvasRelationAnalysisSession('aliases');
  session.receive(document);
  const reads = document.sidecar.relations.filter((binding) => binding.sourceRef != null);
  return { document, session, reads };
}

describe('rename canonical occurrence', () => {
  it.each([0, 1])(
    'renames port %s below a transformed input without altering data semantics',
    async (port) => {
      const { session, reads } = setup();
      const read = reads[port]!;
      const before = await applySelectedRelationSortFetch(session, {
        relationId: read.relationId,
        expectedRevision: session.revision,
        intent: 'insert',
        operation: 'fetch',
        count: 4n,
      });
      const result = await renameSourceOccurrence(session, {
        relationId: read.relationId,
        expectedRevision: session.revision,
        alias: 'Filtered instance',
      });
      expect(result.plan).toEqual(before.plan);
      expect(new Map(result.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(before.sidecar.fields.map((field) => [field.fieldId, field]))
      );
      expect(
        new Map(result.sidecar.relations.map((binding) => [binding.relationId, binding]))
      ).toEqual(
        new Map(
          before.sidecar.relations.map((binding) => [
            binding.relationId,
            binding.relationId === read.relationId
              ? { ...binding, displayName: 'Filtered instance' }
              : binding,
          ])
        )
      );
      expect(indexSubstraitRelations(result).ok).toBe(true);
      expect(deriveSubstraitSchemas(result).schemas).toEqual(
        deriveSubstraitSchemas(before).schemas
      );
      expect(new Set(session.matchingSources(read.sourceRef!, session.revision))).toEqual(
        new Set(reads.map((item) => item.relationId))
      );
    }
  );
  it.each(['', '   ', 'bad\0name', 'x'.repeat(257)])(
    'rejects invalid alias %j atomically',
    async (alias) => {
      const { session, reads } = setup();
      const revision = session.revision;
      await expect(
        renameSourceOccurrence(session, {
          relationId: reads[0]!.relationId,
          expectedRevision: revision,
          alias,
        })
      ).rejects.toThrow();
      expect(session.revision).toBe(revision);
    }
  );
  it('rejects operations, missing targets and cancellation before mutation', async () => {
    const { session, reads } = setup();
    const revision = session.revision;
    for (const relationId of [session.rootId, 'missing']) {
      await expect(
        renameSourceOccurrence(session, { relationId, expectedRevision: revision, alias: 'Alias' })
      ).rejects.toThrow();
    }
    const cancellation = new AbortController();
    cancellation.abort();
    await expect(
      renameSourceOccurrence(session, {
        relationId: reads[0]!.relationId,
        expectedRevision: revision,
        alias: 'Alias',
        signal: cancellation.signal,
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });
});
