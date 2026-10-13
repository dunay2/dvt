// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, getByLabelText, getByText } from '@testing-library/dom';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { RelationAnalysisTestHost } from './SelectedUnaryForm.test-support';
import {
  setupWorkbenchTest,
  root,
  container,
  COPY,
} from './CanvasRelationalTreeWorkbench.test-support';
import { graphJoin, appendGraphSource } from './canvasRelationGraph.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import { functionBearingJoinFixture } from './canvasJoin.test-support';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { joinPredicateFormulaScope } from './canvasJoinPredicateFormula';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';

vi.mock('../../components/monaco/MonacoCodeEditor', async () => ({
  MonacoCodeEditor: (await import('./formulaMonaco.test-support')).FormulaMonacoTestSurface,
}));
vi.mock('./canvasFormulaMonaco', () => ({ configureFormulaEditor: () => () => undefined }));

describe('exact JOIN predicate selection', () => {
  setupWorkbenchTest();
  it('hands pending simple edits to functions without writing, and restores the draft on Cancel', async () => {
    const { session, document } = graphJoin();
    const before = encodeDvtSubstraitSemanticDocument(document);
    const writes = vi.fn();
    await act(async () =>
      root.render(
        <RelationAnalysisTestHost document={document}>
          <CanvasRelationalTreeJoinEditor
            copy={COPY}
            selectedRelationId={session.rootId}
            onChange={writes}
          />
        </RelationAnalysisTestHost>
      )
    );
    await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
    await act(async () =>
      fireEvent.change(getByLabelText(container, 'Comparador de la condición'), {
        target: { value: 'not_equal' },
      })
    );
    const handoff = container.querySelector<HTMLButtonElement>(
      '[data-slot="join-condition-formula-edit"]'
    );
    expect(handoff).not.toBeNull();
    expect(handoff?.disabled).toBe(false);
    await act(async () => handoff!.click());
    const copy = resolveCanvasSemanticEditorCopy(useApplicationLanguageStore.getState().language);
    expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toContain('NOT_EQUAL');
    expect(container.textContent).toContain(copy.derivedOutput.functions);
    expect(container.querySelector('[aria-label="Comparador de la condición"]')).toBeNull();
    expect(writes).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(getByText(container, copy.joinFormula.cancel)));
    expect(
      container.querySelector<HTMLSelectElement>('[aria-label="Comparador de la condición"]')?.value
    ).toBe('not_equal');
    expect(writes).not.toHaveBeenCalled();
    expect(encodeDvtSubstraitSemanticDocument(document)).toEqual(before);
    session.dispose();
  });
  it('saves functions after a local handoff, clears the simple draft and reopens the same predicate', async () => {
    const { session, document } = graphJoin();
    let saved = document;
    const writes = vi.fn();
    function Host() {
      const [draft, setDraft] = useState(document);
      return (
        <RelationAnalysisTestHost document={draft}>
          <CanvasRelationalTreeJoinEditor
            copy={COPY}
            selectedRelationId={session.rootId}
            onChange={(next) => {
              saved = next;
              writes(next);
              setDraft(next);
            }}
          />
        </RelationAnalysisTestHost>
      );
    }
    await act(async () => root.render(<Host />));
    await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="join-condition-formula-edit"]')!
        .click()
    );
    await act(async () =>
      fireEvent.change(container.querySelector('textarea')!, {
        target: { value: 'CONCAT("L.left.name", "R.right.name") = \'match\'' },
      })
    );
    const save = container.querySelector<HTMLButtonElement>(
      '[data-slot="join-predicate-formula"] button[type="submit"]'
    )!;
    expect(save.disabled).toBe(false);
    await act(async () => save.click());
    expect(writes).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-slot="join-predicate-formula"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="semantic-workbench-join-condition-editor"]')
    ).toBeNull();
    const reopened = new CanvasRelationAnalysisSession('model');
    reopened.receive(decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(saved)));
    const before = await querySelectedJoin(session, session.rootId, session.revision);
    const after = await querySelectedJoin(reopened, reopened.rootId, reopened.revision);
    expect(joinPredicateFormulaScope(after).formula).toContain('CONCAT');
    expect(after.output.bindings).toEqual(before.output.bindings);
    expect(after.target.inputs).toEqual(before.target.inputs);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="join-predicate-formula-open"]')!
        .click()
    );
    expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toContain('CONCAT');
    session.dispose();
    reopened.dispose();
  });
  it.each(['invalid', 'read-only'] as const)(
    'blocks %s simple drafts from handing off to functions without writing',
    async (reason) => {
      const { session, document: original } = graphJoin();
      const document =
        reason === 'read-only'
          ? original
          : createSourceJoin({
              left: { source: source('left'), fields: ['customer_id'], fieldTypes: ['i64'] },
              right: { source: source('right'), fields: ['customer_id'], fieldTypes: ['i64'] },
              leftFieldName: 'customer_id',
              rightFieldName: 'customer_id',
              targetNodeId: 'model',
            });
      session.receive(document);
      const writes = vi.fn();
      const render = (disabled: boolean) => (
        <RelationAnalysisTestHost document={document}>
          <CanvasRelationalTreeJoinEditor
            copy={COPY}
            selectedRelationId={session.rootId}
            onChange={writes}
            disabled={disabled}
          />
        </RelationAnalysisTestHost>
      );
      await act(async () => root.render(render(false)));
      await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
      if (reason === 'read-only') await act(async () => root.render(render(true)));
      else
        await act(async () =>
          fireEvent.change(
            container.querySelector(
              '[data-slot="semantic-workbench-join-izquierdo-operand"] select'
            )!,
            {
              target: { value: 'literal' },
            }
          )
        );
      if (reason === 'invalid')
        await act(async () =>
          fireEvent.change(
            container.querySelector(
              '[data-slot="semantic-workbench-join-izquierdo-operand"] input'
            )!,
            {
              target: { value: '' },
            }
          )
        );
      const handoff = container.querySelector<HTMLButtonElement>(
        '[data-slot="join-condition-formula-edit"]'
      )!;
      expect(handoff.disabled).toBe(true);
      await act(async () => handoff.click());
      expect(container.querySelector('[data-slot="join-predicate-formula"]')).toBeNull();
      expect(
        container.querySelector('[data-slot="semantic-workbench-join-condition-editor"]')
      ).not.toBeNull();
      expect(writes).not.toHaveBeenCalled();
      session.dispose();
    }
  );
  it('does not relabel a stale simple draft with the new document revision', async () => {
    const { session, document } = graphJoin();
    const writes = vi.fn();
    let refresh!: (next: SubstraitDocument) => void;
    function Host() {
      const [draft, setDraft] = useState(document);
      refresh = setDraft;
      return (
        <RelationAnalysisTestHost document={draft}>
          <CanvasRelationalTreeJoinEditor
            copy={COPY}
            selectedRelationId={session.rootId}
            onChange={writes}
          />
        </RelationAnalysisTestHost>
      );
    }
    await act(async () => root.render(<Host />));
    await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
    await act(async () =>
      fireEvent.change(getByLabelText(container, 'Comparador de la condición'), {
        target: { value: 'not_equal' },
      })
    );
    const selected = await querySelectedJoin(session, session.rootId, session.revision);
    const refreshed = await replaceSelectedJoinConditions(session, {
      relationId: selected.relationId,
      expectedRevision: selected.revision,
      conditions: [
        ...selected.conditions!,
        {
          left: { kind: 'field', sourceFieldId: selected.fields[0]!.fieldId },
          operator: 'is_not_null',
        },
      ],
    });
    await act(async () => refresh(refreshed));
    const copy = resolveCanvasSemanticEditorCopy(useApplicationLanguageStore.getState().language);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(copy.derivedOutput.stale);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="join-condition-formula-edit"]')
        ?.disabled
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[data-slot="semantic-workbench-join-condition-editor"] button:not([aria-label])'
      )?.disabled
    ).toBe(true);
    expect(
      container.querySelector<HTMLSelectElement>('[aria-label="Comparador de la condición"]')?.value
    ).toBe('not_equal');
    expect(writes).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(getByLabelText(container, 'Cerrar editor')));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!.click()
    );
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="join-condition-formula-edit"]')
        ?.disabled
    ).toBe(false);
    session.dispose();
  });
  it.each([
    { port: 0, disabled: false },
    { port: 1, disabled: false },
    { port: 0, disabled: true },
  ] as const)('offers shared formula editing without mutation: %j', async ({ port, disabled }) => {
    const document = functionBearingJoinFixture(port);
    const before = encodeDvtSubstraitSemanticDocument(document);
    const session = new CanvasRelationAnalysisSession('inspection');
    session.receive(document);
    const selected = await querySelectedJoin(session, session.rootId, session.revision);
    expect(selected.conditions).toBeNull();
    let writes = 0;
    await act(async () =>
      root.render(
        <RelationAnalysisTestHost document={document}>
          <CanvasRelationalTreeJoinEditor
            copy={COPY}
            selectedRelationId={session.rootId}
            disabled={disabled}
            onChange={() => {
              writes++;
            }}
          />
        </RelationAnalysisTestHost>
      )
    );
    expect(container.textContent).toContain('TRIM');
    const copy = resolveCanvasSemanticEditorCopy(useApplicationLanguageStore.getState().language);
    expect(container.textContent).toContain(copy.joinFormula.advanced);
    const edit = container.querySelector<HTMLButtonElement>(
      '[data-slot="join-predicate-formula-open"]'
    );
    expect(edit?.disabled).toBe(disabled);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();
    expect(container.querySelector('[aria-label="Editar condición"]')).toBeNull();
    expect(writes).toBe(0);
    expect(encodeDvtSubstraitSemanticDocument(document)).toEqual(before);
    session.dispose();
  });
  it.each(['inner', 'outer'] as const)(
    'edits only the selected %s JOIN and retains the other predicate',
    async (selection) => {
      const { session } = graphJoin();
      const inner = session.rootId;
      const document = await appendGraphSource(session, 'third');
      const outer = session.rootId;
      const id = selection === 'inner' ? inner : outer;
      let saved = document;
      function Host(): React.JSX.Element {
        const [draft, setDraft] = useState(document);
        return (
          <RelationAnalysisTestHost document={draft}>
            <CanvasRelationalTreeJoinEditor
              copy={COPY}
              selectedRelationId={id}
              onChange={(next) => {
                saved = next;
                setDraft(next);
              }}
            />
          </RelationAnalysisTestHost>
        );
      }
      await act(async () => root.render(<Host />));
      expect(container.querySelector('[aria-label="Comparador de la condición"]')).toBeNull();
      await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
      await act(async () =>
        fireEvent.change(getByLabelText(container, 'Comparador de la condición'), {
          target: { value: 'not_equal' },
        })
      );
      await act(async () => fireEvent.click(getByText(container, 'Guardar condición')));
      const reopened = new CanvasRelationAnalysisSession('model');
      reopened.receive(
        decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(saved))
      );
      expect((await querySelectedJoin(reopened, id, reopened.revision)).conditions).toMatchObject([
        { operator: 'not_equal' },
      ]);
      expect(
        (await querySelectedJoin(reopened, id === inner ? outer : inner, reopened.revision))
          .conditions
      ).toMatchObject([{ operator: 'equal' }]);
      expect(
        new Map(saved.sidecar.relations.map((binding) => [binding.relationId, binding]))
      ).toEqual(
        new Map(document.sidecar.relations.map((binding) => [binding.relationId, binding]))
      );
      expect(new Map(saved.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(document.sidecar.fields.map((field) => [field.fieldId, field]))
      );
    }
  );
});
