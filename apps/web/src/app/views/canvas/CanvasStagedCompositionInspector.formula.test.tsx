// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, getByLabelText, getByText } from '@testing-library/dom';
import { CanvasStagedOperationInspector } from './CanvasStagedOperationInspector';
import { graphModel } from './canvasRelationGraph.test-support';
import { stagedModelJoinFixture } from './stagedAnalysisContext.test-support';
import {
  setupWorkbenchTest,
  root,
  container,
  COPY,
} from './CanvasRelationalTreeWorkbench.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import { joinPredicateFormulaScope } from './canvasJoinPredicateFormula';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

vi.mock('../../components/monaco/MonacoCodeEditor', async () => ({
  MonacoCodeEditor: (await import('./formulaMonaco.test-support')).FormulaMonacoTestSurface,
}));
vi.mock('./canvasFormulaMonaco', () => ({ configureFormulaEditor: () => () => undefined }));

describe('configured staged JOIN formula context', () => {
  setupWorkbenchTest();
  it('keeps formulas reachable when both inputs are Model publications', async () => {
    const fixture = stagedModelJoinFixture();
    const original = encodeDvtSubstraitSemanticDocument(fixture.document);
    const writes = vi.fn();
    await act(async () =>
      root.render(
        <CanvasStagedOperationInspector
          binding={fixture.binding}
          staged={fixture.staged}
          producerDocument={null}
          transformNode={graphModel()}
          copy={COPY}
          onClose={vi.fn()}
          onPendingChange={vi.fn()}
          onUpdate={writes}
        />
      )
    );
    await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
    const action = container.querySelector<HTMLButtonElement>(
      '[data-slot="join-condition-formula-edit"]'
    )!;
    expect(action.disabled).toBe(false);
    await act(async () => action.click());
    expect(container.querySelector('[data-slot="join-predicate-formula"]')).not.toBeNull();
    expect(writes).not.toHaveBeenCalled();
    const copy = resolveCanvasSemanticEditorCopy(useApplicationLanguageStore.getState().language);
    await act(async () => fireEvent.click(getByText(container, copy.joinFormula.cancel)));
    expect(container.querySelector('[data-slot="join-predicate-formula"]')).toBeNull();
    expect(writes).not.toHaveBeenCalled();
    expect(encodeDvtSubstraitSemanticDocument(fixture.document)).toEqual(original);
  });

  it('saves and reopens a mixed-input scalar without changing JOIN inputs or outputs', async () => {
    const fixture = stagedModelJoinFixture();
    let saved = fixture.staged;
    const writes = vi.fn();
    function Host(): React.JSX.Element {
      const [staged, setStaged] = useState(fixture.staged);
      return (
        <CanvasStagedOperationInspector
          binding={fixture.binding}
          staged={staged}
          producerDocument={null}
          transformNode={graphModel()}
          copy={COPY}
          onClose={vi.fn()}
          onPendingChange={vi.fn()}
          onUpdate={(update) => {
            saved = { ...staged, ...update };
            writes(update);
            setStaged(saved);
          }}
        />
      );
    }
    await act(async () => root.render(<Host />));
    await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="join-condition-formula-edit"]')!
        .click()
    );
    const labels = [
      ...container.querySelectorAll('[data-slot="formula-operand"][data-kind="field"] > span'),
    ].map((field) => field.textContent!);
    expect(labels[0]).toMatch(/^L\./u);
    expect(labels.at(-1)).toMatch(/^R\./u);
    const formula = `CONCAT("${labels[0]}", "${labels.at(-1)}") = 'match'`;
    await act(async () =>
      fireEvent.change(container.querySelector('textarea')!, { target: { value: formula } })
    );
    const save = container.querySelector<HTMLButtonElement>(
      '[data-slot="join-predicate-formula"] button[type="submit"]'
    )!;
    expect(save.disabled).toBe(false);
    await act(async () => save.click());
    expect(writes).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-slot="join-predicate-formula"]')).toBeNull();

    const connection = fixture.inputs[0]!.producer!.connection;
    const before = new CanvasRelationAnalysisSession(fixture.staged.id, connection);
    const after = new CanvasRelationAnalysisSession(fixture.staged.id, connection);
    try {
      before.receive(fixture.document);
      after.receive(decodeCanvasStagedOperation(saved));
      const original = await querySelectedJoin(before, before.rootId, before.revision);
      const reopened = await querySelectedJoin(after, after.rootId, after.revision);
      expect(reopened.target.inputs).toEqual(original.target.inputs);
      expect(reopened.output.bindings).toEqual(original.output.bindings);
      expect(joinPredicateFormulaScope(reopened).formula).toContain('CONCAT');
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[data-slot="join-predicate-formula-open"]')!
          .click()
      );
      expect(container.querySelector<HTMLTextAreaElement>('textarea')!.value).toContain('CONCAT');
      expect(writes).toHaveBeenCalledTimes(1);
    } finally {
      before.dispose();
      after.dispose();
    }
  });
});
