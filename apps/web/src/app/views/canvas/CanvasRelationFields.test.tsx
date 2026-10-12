// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { repeatedOccurrenceDraft } from './relational-source-occurrence/occurrence.test.fixtures';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasRelationFields } from './CanvasRelationFields';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

describe('selected relation fields', () => {
  setupWorkbenchTest();
  it('reads the exact occurrence, reuses analysis and never falls back to root fields', async () => {
    const document = repeatedOccurrenceDraft();
    const reads = document.sidecar.relations.filter((relation) => relation.sourceRef != null);
    let analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    function Host({ id }: { id: string }): React.JSX.Element {
      analysis = useCanvasRelationAnalysisSession(document, 'model');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasRelationFields relationId={id} />
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    for (const read of reads) {
      await act(async () => root.render(<Host id={read.relationId} />));
      const expected = document.sidecar.fields.filter(
        (field) => field.relationId === read.relationId
      );
      const fields = [...container.querySelectorAll('[data-field-id]')];
      expect(fields.map((field) => field.getAttribute('data-field-id'))).toEqual(
        expected.map((field) => field.fieldId)
      );
      expect(fields.map((field) => field.querySelector('dt')?.textContent)).toEqual(
        expected.map((field) => field.displayName)
      );
    }
    const before = analysis!.session.work;
    await act(async () => root.render(<Host id={reads[0]!.relationId} />));
    expect(analysis!.session.work).toEqual(before);
    await act(async () => root.render(<Host id="missing" />));
    expect(container.querySelectorAll('[data-field-id]')).toHaveLength(0);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
