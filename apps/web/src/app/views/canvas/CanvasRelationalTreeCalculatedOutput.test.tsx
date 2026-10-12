// @vitest-environment jsdom
/**
 * Owned concern: prove SELECT formula authoring reuses the existing atomic projection command.
 * @baseline GH-3613: ON remains boolean; calculated output may return text.
 * @decision Exercise the real inline inspector with only Monaco's DOM surface substituted.
 * @consequence Cancellation preserves the JOIN and successful authoring focuses its projection.
 * @version 1.0.0
 */
import React, { act, useState } from 'react';
import { fireEvent, isInaccessible, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import { projectCanvasStagedDocument } from './canvasStagedOperationDocument';
import { RelationAnalysisTestHost } from './SelectedUnaryForm.test-support';
import {
  setupWorkbenchTest,
  root,
  container,
  COPY,
} from './CanvasRelationalTreeWorkbench.test-support';

vi.mock('../../components/monaco/MonacoCodeEditor', async () => ({
  MonacoCodeEditor: (await import('./formulaMonaco.test-support')).FormulaMonacoTestSurface,
}));
vi.mock('./canvasFormulaMonaco', () => ({ configureFormulaEditor: () => () => undefined }));

describe('calculated SELECT Output', () => {
  setupWorkbenchTest();
  it.each([false, true])(
    'adds text output without changing ON or focusing an internal layer (nested: %s)',
    async (nested) => {
      const { document: initial, session } = graphJoin();
      const joinId = session.rootId;
      const document = nested
        ? (
            await insertSelectedRelationTransform(session, {
              relationId: joinId,
              expectedRevision: session.revision,
            })
          ).document
        : initial;
      const originalJoin = session.locate(joinId, session.revision).relation;
      const fields = (await session.query(joinId)).bindings;
      const formula = `CONCAT("${fields[1]!.displayName}", "${fields.at(-1)!.displayName}")`;
      let saved = document;
      let focused = joinId;
      const writes = vi.fn();
      const outputList = (): HTMLElement =>
        container.querySelector<HTMLElement>(
          '[data-canvas-inspector="true"]:not([hidden]) [data-slot="canvas-relation-outputs"]'
        )!;
      function Host(): React.JSX.Element {
        const [draft, setDraft] = useState(document);
        const [selected, select] = useState(joinId);
        const [pending, setPending] = useState(false);
        return (
          <RelationAnalysisTestHost document={draft}>
            <button data-testid="apply" disabled={pending}>
              Apply
            </button>
            <CanvasRelationalTreeInlineEditor
              copy={COPY}
              joinDraft={draft}
              operation="inner_join"
              selectedRelationId={selected}
              transformNode={graphModel(draft)}
              expanded
              onClose={() => {}}
              onPendingConditionChange={setPending}
              onSelectRelation={(id) => {
                focused = id;
                select(id);
              }}
              onChangeJoinDraft={(next) => {
                saved = next;
                writes();
                setDraft(next);
              }}
            />
          </RelationAnalysisTestHost>
        );
      }
      const edit = async (): Promise<void> => {
        await act(async () =>
          fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
        );
        expect(isInaccessible(outputList())).toBe(true);
        await act(async () => {
          fireEvent.change(container.querySelector('input[name="alias"]')!, {
            target: { value: 'combined' },
          });
          fireEvent.change(container.querySelector('textarea[name="formula"]')!, {
            target: { value: formula },
          });
        });
        expect(container.querySelector<HTMLButtonElement>('[data-testid="apply"]')!.disabled).toBe(
          true
        );
      };
      await act(async () => root.render(<Host />));
      await waitFor(() =>
        expect(
          container.querySelector(
            '[data-value="output"] [data-slot="canvas-derived-output-trigger"]'
          )
        ).not.toBeNull()
      );
      await act(async () =>
        fireEvent.mouseDown(container.querySelector('[data-slot="canvas-operation-output-tab"]')!, {
          button: 0,
        })
      );
      expect(isInaccessible(outputList())).toBe(false);
      await edit();
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-cancel"]')!)
      );
      expect(writes).not.toHaveBeenCalled();
      expect(focused).toBe(joinId);
      expect(isInaccessible(outputList())).toBe(false);
      await edit();
      await act(async () =>
        fireEvent.submit(container.querySelector('[data-slot="canvas-derived-output-form"]')!)
      );
      await waitFor(() => expect(writes).toHaveBeenCalledOnce());
      const indexed = indexSubstraitRelations(saved);
      expect(indexed.ok).toBe(true);
      if (!indexed.ok) throw indexed.error;
      const consumer = indexed.index.relations.get(
        indexed.index.relations.get(joinId)!.consumers[0]!
      )!;
      expect(focused).toBe(consumer.binding.authoringOwnerRelationId);
      expect(focused === indexed.index.rootId).toBe(!nested);
      expect(focused).not.toBe(joinId);
      expect(indexed.index.relations.get(joinId)!.relation).toEqual(originalJoin);
      expect(indexed.index.relations.get(focused)!.relation.relType.case).toBe('project');
      const projected = await projectSubstraitToPostgresSql(
        projectCanvasStagedDocument(saved, focused)!
      );
      expect(projected.sql).toContain('||');
      expect(projected.projection.outputs.at(-1)).toMatchObject({
        name: 'combined',
        dataType: 'string',
      });
      await waitFor(() =>
        expect(
          container.querySelector(
            '[data-slot="canvas-transform-inspector"] [data-value="output"] [data-slot="canvas-derived-output"]'
          )?.textContent
        ).toContain('combined')
      );
      expect(isInaccessible(outputList())).toBe(false);
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="canvas-derived-output"] button')!)
      );
      expect(isInaccessible(outputList())).toBe(true);
      expect(container.querySelector<HTMLInputElement>('input[name="alias"]')!.value).toBe(
        'combined'
      );
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-cancel"]')!)
      );
      expect(isInaccessible(outputList())).toBe(false);
      expect(writes).toHaveBeenCalledOnce();
      await act(async () =>
        root.render(
          <RelationAnalysisTestHost document={saved}>
            <CanvasTransformInspector
              relationId={focused}
              transformNode={graphModel(saved)}
              draft={saved}
              onClose={() => {}}
            />
          </RelationAnalysisTestHost>
        )
      );
      expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).toBeNull();
      session.dispose();
    }
  );
});
