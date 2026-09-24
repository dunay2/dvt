// @vitest-environment jsdom
/** Owned concern: each selected wrapper owns an independent, discardable form. */
import React, { act } from 'react';
import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';
import { RelationAnalysisTestHost } from './SelectedUnaryForm.test-support';
import { fireEvent, getByLabelText } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  applyDvtSubstraitFetch,
  applyDvtSubstraitSort,
  inspectCanvasDvtSubstraitSortFetch,
  resolveDvtSubstraitSortFetchInputFields,
} from './canvasSortFetch.test-support';
import { createDvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import { CanvasRelationalTreeSortFetchEditor } from './CanvasRelationalTreeSortFetchEditor';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';

describe('Sort/Fetch editor selection', () => {
  setupWorkbenchTest();

  it('does not submit the previous Fetch values to a newly selected inner Fetch', async () => {
    const pilot = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source',
      targetNodeId: 'transform',
    });
    const inner = applyDvtSubstraitFetch(pilot, { count: 2n, offset: 1n });
    const innerInspection = inspectCanvasDvtSubstraitSortFetch(inner);
    if (!innerInspection.ok) throw new Error('Expected inner Fetch');
    const sorted = applyDvtSubstraitSort(inner, [
      {
        fieldId: resolveDvtSubstraitSortFetchInputFields(inner)[0]!.fieldId,
        direction: SortField_SortDirection.ASC_NULLS_LAST,
      },
    ]);
    const outer = applyDvtSubstraitFetch(sorted, { count: 8n, offset: 3n });
    const outerInspection = inspectCanvasDvtSubstraitSortFetch(outer);
    if (!outerInspection.ok) throw new Error('Expected outer Fetch');
    const onChange = vi.fn();
    const render = async (relationId: string): Promise<void> => {
      await act(async () =>
        root.render(
          <RelationAnalysisTestHost document={outer}>
            <CanvasRelationalTreeSortFetchEditor
              draft={outer}
              operation="fetch"
              relationId={relationId}
              onChange={onChange}
              onClose={vi.fn()}
            />
          </RelationAnalysisTestHost>
        )
      );
    };
    await render(outerInspection.relationId);
    expect((getByLabelText(container, 'LIMIT') as HTMLInputElement).value).toBe('8');
    await act(async () => {
      fireEvent.change(getByLabelText(container, 'LIMIT'), { target: { value: '7' } });
    });
    await render(innerInspection.relationId);
    expect((getByLabelText(container, 'LIMIT') as HTMLInputElement).value).toBe('2');
    expect((getByLabelText(container, 'OFFSET') as HTMLInputElement).value).toBe('1');
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    const saved = onChange.mock.calls[0]![0];
    expect(
      inspectCanvasDvtSubstraitSortFetch(
        selectDvtSubstraitRelation(saved, innerInspection.relationId)
      )
    ).toMatchObject({ count: 2n, offset: 1n });
    expect(inspectCanvasDvtSubstraitSortFetch(saved)).toMatchObject({ count: 8n, offset: 3n });
  });
});
