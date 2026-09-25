// @vitest-environment jsdom
/** A clean selected editor must not clear another relation's unsaved predicate. */
import React, { act, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import { RelationAnalysisTestHost } from './SelectedUnaryForm.test-support';
import {
  setupWorkbenchTest,
  root,
  container,
  COPY,
} from './CanvasRelationalTreeWorkbench.test-support';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';

describe('pending edits across relation selection', () => {
  setupWorkbenchTest();
  it('retains a JOIN draft and blocks apply while a clean aggregate is selected', async () => {
    const { session } = graphJoin();
    const joinId = session.rootId;
    const input = await session.query(joinId);
    const document = await applySelectedRelationAggregate(session, {
      intent: 'insert',
      relationId: joinId,
      expectedRevision: session.revision,
      fieldId: input.bindings[0]!.fieldId,
      alias: 'total',
    });
    function Host() {
      const [selected, select] = useState(joinId);
      const [pending, setPending] = useState(false);
      return (
        <RelationAnalysisTestHost document={document}>
          <button data-testid="join" onClick={() => select(joinId)}>
            JOIN
          </button>
          <button data-testid="aggregate" onClick={() => select(session.rootId)}>
            Aggregate
          </button>
          <button data-testid="apply" disabled={pending}>
            Apply
          </button>
          <CanvasRelationalTreeInlineEditor
            appendInput={null}
            copy={COPY}
            joinDraft={document}
            selectedRelationId={selected}
            transformNode={graphModel(document)}
            operation="inner_join"
            expanded
            onClose={() => {}}
            onChangeJoinDraft={() => {}}
            onAppendJoinInput={() => {}}
            onPendingConditionChange={setPending}
          />
        </RelationAnalysisTestHost>
      );
    }
    await act(async () => root.render(<Host />));
    const apply = () => container.querySelector<HTMLButtonElement>('[data-testid="apply"]')!;
    expect(apply().disabled).toBe(false);
    await act(async () =>
      fireEvent.change(container.querySelector('[aria-label="Comparador de la condición"]')!, {
        target: { value: 'not_equal' },
      })
    );
    expect(apply().disabled).toBe(true);
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="aggregate"]')!.click()
    );
    expect(container.querySelector('form')).not.toBeNull();
    expect(apply().disabled).toBe(true);
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="join"]')!.click()
    );
    expect(
      container.querySelector<HTMLSelectElement>('[aria-label="Comparador de la condición"]')!.value
    ).toBe('not_equal');
    expect(apply().disabled).toBe(true);
  });
});
