// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { CanvasRelationalFieldSelectionProvider } from './CanvasRelationalFieldSelectionProvider';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import { projectSemanticWorkbenchRelations } from './semanticWorkbenchRelations';
import { relationalExpressionSlices } from './canvasRelationalExpressionSlice';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';

describe('remove a complete expression from its tree root', () => {
  setupWorkbenchTest();
  it.each([false, true])(
    'shows the excluded formula and adds only its result (readonly=%s)',
    async (disabled) => {
      const session = new CanvasRelationAnalysisSession('output-inspector');
      session.receive(connectedNamesProjectionDraft());
      await applySelectedRelationDerivedOutput(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'edit',
        alias: 'trimmed_name',
        formula: 'TRIM(first_name)',
      });
      const initial = await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        outputs: [],
      });
      const writes = vi.fn();
      function Host(): React.JSX.Element {
        const [document, setDocument] = useState(initial);
        const analysis = useCanvasRelationAnalysisSession(document, 'output-inspector');
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            <CanvasRelationOutputs
              relationId={session.rootId}
              disabled={disabled}
              onChange={(next) => {
                writes(next);
                setDocument(next);
              }}
            />
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () => root.render(<Host />));
      const rows = [...container.querySelectorAll('[data-slot="relation-output-field"]')];
      expect(rows).toHaveLength(3);
      const calculated = rows[2]!;
      expect(calculated.querySelector('input')?.value).toBe('trimmed_name');
      expect(
        calculated.querySelector('[data-slot="relation-output-expression"]')?.textContent
      ).toBe('TRIM(first_name)');
      const add = calculated.querySelector<HTMLButtonElement>('button')!;
      expect(add.getAttribute('aria-label')).toContain('trimmed_name: TRIM(first_name)');
      expect(add.disabled).toBe(disabled);
      await act(async () => add.click());
      expect(writes).toHaveBeenCalledTimes(disabled ? 0 : 1);
      if (disabled) return;
      session.receive(writes.mock.calls[0]![0]);
      expect((await session.query(session.rootId)).bindings).toHaveLength(1);
      expect(container.querySelectorAll('[data-included="true"]')).toHaveLength(1);
      expect(
        calculated.querySelector('[data-slot="relation-output-expression"]')?.textContent
      ).toBe('TRIM(first_name)');
    }
  );
  it.each([
    { emitted: true, gesture: 'click', editable: true },
    { emitted: false, gesture: 'click', editable: true },
    { emitted: true, gesture: 'Delete', editable: true },
    { emitted: false, gesture: 'Delete', editable: true },
    { emitted: true, gesture: 'Delete', editable: false },
    { emitted: false, gesture: 'click', editable: false },
  ])(
    '$gesture removes TRIM (emitted=$emitted, editable=$editable), never its input field',
    async ({ emitted, gesture, editable }) => {
      const session = new CanvasRelationAnalysisSession('fixture');
      session.receive(connectedNamesProjectionDraft());
      let initial = await applySelectedRelationDerivedOutput(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'edit',
        alias: 'trimmed_name',
        formula: 'TRIM(first_name)',
      });
      if (!emitted)
        initial = await changeSelectedRelationOutputs(session, {
          relationId: session.rootId,
          expectedRevision: session.revision,
          outputs: [{ slot: 0 }, { slot: 1 }],
        });
      const before = session.locate(session.rootId, session.revision);
      const inputId = readCanvasTransformDependencyModel(before, (id) =>
        session.locate(id, session.revision)
      ).input.binding.relationId;
      const writes = vi.fn();
      const cardClick = vi.fn();
      function Host(): React.JSX.Element {
        const [document, setDocument] = useState<SubstraitDocument>(initial);
        const analysis = useCanvasRelationAnalysisSession(document, 'removal');
        const planRoot = document.plan.relations[0]!.relType;
        if (planRoot.case !== 'root' || planRoot.value.input == null)
          throw new Error('Expected root');
        const graph = projectSemanticWorkbenchRelations(document, planRoot.value.input, 'model');
        const indexed = indexSubstraitRelations(document);
        if (!indexed.ok) throw indexed.error;
        const model = readCanvasTransformDependencyModel(
          indexed.index.relations.get(indexed.index.rootId)!,
          (id) => indexed.index.relations.get(id)!
        );
        const slice = relationalExpressionSlices(graph, new Set())(graph.relationId, model);
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            <CanvasRelationalFieldSelectionProvider
              enabled={editable}
              onChange={(next) => {
                writes(next);
                setDocument(next);
              }}
            >
              <div onClick={cardClick}>
                <CanvasRelationalScalarTree
                  compact
                  graph={{ ...graph, nodes: slice.nodes, edges: slice.edges }}
                />
              </div>
            </CanvasRelationalFieldSelectionProvider>
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () => root.render(<Host />));
      expect(container.textContent).toContain('TRIM');
      const button = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-expression-remove"]'
      )!;
      expect(button).not.toBeNull();
      expect(button.disabled).toBe(!editable);
      const token = container.querySelector('[data-kind="expression"]')!;
      await act(async () => {
        if (gesture === 'click') button.click();
        else fireEvent.keyDown(token, { key: 'Delete' });
      });
      expect(cardClick).not.toHaveBeenCalled();
      expect(writes).toHaveBeenCalledTimes(editable ? 1 : 0);
      if (!editable) {
        expect(container.textContent).toContain('TRIM');
        return;
      }
      expect(container.textContent).not.toContain('TRIM');
      session.receive(writes.mock.calls[0]![0]);
      const after = session.locate(session.rootId, session.revision);
      expect(after.inputs).toEqual([inputId]);
      expect(after.fields.map((field) => field.fieldId)).toEqual(
        before.fields.slice(0, 2).map((field) => field.fieldId)
      );
      expect(
        after.relation.relType.case === 'project' && after.relation.relType.value.expressions
      ).toEqual([]);
    }
  );
});
