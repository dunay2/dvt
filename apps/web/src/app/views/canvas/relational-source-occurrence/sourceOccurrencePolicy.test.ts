/** Occurrences accept any typed result and reject only real connection/schema incompatibility. */
import { describe, expect, it } from 'vitest';
import { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import { resolveCanvasDvtCompositionInputs } from '../canvasDvtCompositionInputCatalog';
import { applySelectedRelationSortFetch } from '../canvasSelectedRelationSortFetch';
import { occurrenceGraph } from './occurrence.test.fixtures';
import { sourceOccurrenceAppendRejection } from './sourceOccurrencePolicy';

async function setup(transformed = false): Promise<{
  session: CanvasRelationAnalysisSession;
  revision: number;
  editable: boolean;
  output: Awaited<ReturnType<CanvasRelationAnalysisSession['query']>>;
  input: NonNullable<Parameters<typeof sourceOccurrenceAppendRejection>[0]['input']>;
}> {
  const graph = occurrenceGraph();
  const session = new CanvasRelationAnalysisSession('occurrences');
  session.receive(graph.draft);
  if (transformed)
    await applySelectedRelationSortFetch(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      operation: 'fetch',
      count: 8n,
    });
  const [input] = resolveCanvasDvtCompositionInputs({
    nodes: graph.nodes,
    edges: graph.edges,
    targetNodeId: graph.targetNode.id,
  });
  return {
    session,
    revision: session.revision,
    output: await session.query(null),
    input: input!,
    editable: true,
  };
}
describe('occurrence admission', () => {
  it.each([false, true])(
    'admits an existing physical source after transformation=%s',
    async (transformed) => {
      const args = await setup(transformed);
      expect(sourceOccurrenceAppendRejection({ ...args, operation: 'inner_join' })).toBeNull();
      expect(sourceOccurrenceAppendRejection({ ...args, operation: 'cross_join' })).toBeNull();
    }
  );
  it('does not silently remove fields whose types cannot be represented', async () => {
    const args = await setup();
    expect(
      sourceOccurrenceAppendRejection({
        ...args,
        input: {
          ...args.input,
          fields: [
            ...args.input.fields,
            { name: 'unmapped', dataType: 'unknown', joinDataType: null },
          ],
        },
      })
    ).toBe('incompatible');
  });
  it('checks SET alignment against the result schema, not physical reads', async () => {
    const args = await setup(true);
    expect(sourceOccurrenceAppendRejection({ ...args, operation: 'union_all' })).toBe(
      'incompatible'
    );
    const fields = args.output.bindings
      .filter((field) => field.parentFieldId == null)
      .map((field) => ({
        name: field.displayName!,
        dataType: 'bigint',
        joinDataType: 'i64' as const,
      }));
    expect(
      sourceOccurrenceAppendRejection({
        ...args,
        operation: 'union_all',
        input: {
          ...args.input,
          sourceRef: { ...args.input.sourceRef, sourceObjectId: 'other' },
          fields,
        },
      })
    ).toBeNull();
  });
  it('rejects read-only, missing context, stale revisions and different connections', async () => {
    const args = await setup();
    expect(sourceOccurrenceAppendRejection({ ...args, editable: false })).toBe('read_only');
    expect(sourceOccurrenceAppendRejection({ ...args, input: undefined })).toBe('unavailable');
    expect(sourceOccurrenceAppendRejection({ ...args, output: null })).toBe('unsupported');
    expect(sourceOccurrenceAppendRejection({ ...args, revision: -1 })).toBe('unavailable');
    expect(
      sourceOccurrenceAppendRejection({
        ...args,
        input: {
          ...args.input,
          sourceRef: {
            ...args.input.sourceRef,
            connectionRef: { ...args.input.sourceRef.connectionRef, connectionId: 'other' },
          },
        },
      })
    ).toBe('unavailable');
  });
});
