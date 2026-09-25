import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations, RelationAnalysisSession } from '@dvt/substrait-analysis';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { presentCanvasFilterSummary } from './canvasPresentationFilterSummary';

describe('output-path filter summary', () => {
  it.each([0, 1, 'result'] as const)(
    'summarizes %s without attributing a branch predicate to the model',
    async (port) => {
      const { session, root } = selectedUnaryScenario();
      let analysis: RelationAnalysisSession | undefined;
      try {
        const relationId = port === 'result' ? session.rootId : root.inputs[port]!;
        const input = await session.query(relationId);
        const field = input.bindings.find((binding) => binding.parentFieldId == null)!;
        await applySelectedRelationFilter(session, {
          intent: 'insert',
          relationId,
          expectedRevision: session.revision,
          fieldId: field.fieldId,
          capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
          value: 'active',
        });
        const document = await applySelectedRelationSortFetch(session, {
          intent: 'insert',
          relationId: session.rootId,
          expectedRevision: session.revision,
          operation: 'fetch',
          count: 5n,
        });
        const indexed = indexSubstraitRelations(document);
        if (!indexed.ok) throw indexed.error;
        analysis = new RelationAnalysisSession({ document, scope: 'summary' });
        const entry = { document, index: indexed.index, session: analysis };
        const before = analysis.work;
        const expected = port === 'result' ? `${field.displayName} = 'active'` : undefined;
        expect(await presentCanvasFilterSummary(entry)).toBe(expected);
        if (port !== 'result') expect(analysis.work).toEqual(before);
        const work = analysis.work;
        expect(await presentCanvasFilterSummary(entry)).toBe(expected);
        expect(analysis.work).toEqual(work);
        const cancellation = new AbortController();
        cancellation.abort();
        await expect(presentCanvasFilterSummary(entry, cancellation.signal)).rejects.toBeDefined();
      } finally {
        analysis?.dispose();
        session.dispose();
      }
    }
  );
});
