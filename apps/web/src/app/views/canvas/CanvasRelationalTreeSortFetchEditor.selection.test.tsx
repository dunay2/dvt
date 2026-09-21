// @vitest-environment jsdom
/** Owned concern: each selected wrapper owns an independent, discardable form. */
import React, { act } from 'react';
import { fireEvent, getByLabelText } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  applyDvtSubstraitFetch,
  applyDvtSubstraitSort,
  inspectCanvasDvtSubstraitSortFetch,
  resolveDvtSubstraitSortFetchInputFields,
  selectCanvasDvtSubstraitSortFetch,
} from './canvasDvtSubstraitSortFetch';
import { createDvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import { CanvasRelationalTreeSortFetchEditor } from './CanvasRelationalTreeSortFetchEditor';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';

describe('Sort/Fetch editor selection', () => {
  setupWorkbenchTest();

  it('does not submit the previous Fetch values to a newly selected inner Fetch', () => {
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
    const render = (relationId: string): void => {
      act(() =>
        root.render(
          <CanvasRelationalTreeSortFetchEditor
            draft={outer}
            operation="fetch"
            relationId={relationId}
            onChange={onChange}
            onClose={vi.fn()}
          />
        )
      );
    };
    render(outerInspection.relationId);
    expect((getByLabelText(container, 'LIMIT') as HTMLInputElement).value).toBe('8');
    act(() => {
      fireEvent.change(getByLabelText(container, 'LIMIT'), { target: { value: '7' } });
    });
    render(innerInspection.relationId);
    expect((getByLabelText(container, 'LIMIT') as HTMLInputElement).value).toBe('2');
    expect((getByLabelText(container, 'OFFSET') as HTMLInputElement).value).toBe('1');
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      fireEvent.submit(container.querySelector('form')!);
    });
    const saved = onChange.mock.calls[0]![0];
    expect(
      inspectCanvasDvtSubstraitSortFetch(
        selectCanvasDvtSubstraitSortFetch(saved, innerInspection.relationId)!
      )
    ).toMatchObject({ count: 2n, offset: 1n });
    expect(inspectCanvasDvtSubstraitSortFetch(saved)).toMatchObject({ count: 8n, offset: 3n });
  });
});
