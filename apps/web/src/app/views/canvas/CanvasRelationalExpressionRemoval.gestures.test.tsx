// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
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

describe('remove a complete expression from its tree root', () => {
  setupWorkbenchTest();
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
      const writes = vi.fn();
      const cardClick = vi.fn();
      function Host(): React.JSX.Element {
        const [document, setDocument] = useState<SubstraitDocument>(initial);
        const analysis = useCanvasRelationAnalysisSession(document, 'removal');
        const planRoot = document.plan.relations[0]!.relType;
        if (planRoot.case !== 'root' || planRoot.value.input == null)
          throw new Error('Expected root');
        const graph = projectSemanticWorkbenchRelations(document, planRoot.value.input, 'model');
        const slice = relationalExpressionSlices(graph, new Set())(graph.relationId);
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
      expect(after.inputs).toEqual(before.inputs);
      expect(after.fields.map((field) => field.fieldId)).toEqual(
        before.fields.slice(0, 2).map((field) => field.fieldId)
      );
      expect(
        after.relation.relType.case === 'project' && after.relation.relType.value.expressions
      ).toEqual([]);
    }
  );
});
