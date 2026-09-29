// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { CanvasSelectedUnaryEditor } from './CanvasSelectedUnaryEditor';

describe('selected Filter form', () => {
  setupWorkbenchTest();
  it.each(['include', 'reorder', 'drag'] as const)(
    'keeps Output, frame and focus while updating %s',
    async (gesture) => {
      const { session } = graphJoin();
      const fields = await session.query(session.rootId);
      const initial = await applySelectedRelationFilter(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: fields.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'active',
      });
      const relationId = session.rootId;
      session.dispose();
      const changed = vi.fn();
      function Host(): React.JSX.Element {
        const [draft, setDraft] = useState(initial);
        const analysis = useCanvasRelationAnalysisSession(draft, 'filter-output');
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            <CanvasSelectedUnaryEditor
              draft={draft}
              relationId={relationId}
              operation="filter"
              transformNode={graphModel()}
              onClose={vi.fn()}
              onChange={(next) => {
                changed(next);
                setDraft(next);
              }}
            />
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () => root.render(<Host />));
      const tab = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-operation-output-tab"]'
      )!;
      await act(async () => fireEvent.mouseDown(tab, { button: 0, ctrlKey: false }));
      expect(tab.getAttribute('aria-selected')).toBe('true');
      const frame = container.querySelector('[data-canvas-inspector]')!;
      const control =
        gesture === 'include'
          ? container.querySelector<HTMLElement>('[data-slot="relation-output-toggle"]')!
          : container.querySelector<HTMLElement>('[data-slot="relation-output-field"]')!;
      control.focus();
      if (gesture === 'drag') {
        const target = container.querySelectorAll('[data-slot="relation-output-field"]')[1]!;
        const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
        await act(async () => fireEvent.dragStart(control, { dataTransfer }));
        await act(async () => fireEvent.dragOver(target, { dataTransfer, clientY: 1 }));
        await act(async () => fireEvent.drop(target, { dataTransfer }));
        await act(async () => fireEvent.dragEnd(control, { dataTransfer }));
      } else {
        await act(async () => {
          if (gesture === 'include') fireEvent.click(control);
          else fireEvent.keyDown(control, { key: 'ArrowDown', altKey: true });
        });
      }
      expect(changed).toHaveBeenCalledOnce();
      expect(container.querySelector('[data-canvas-inspector]')).toBe(frame);
      expect(container.querySelector('[data-slot="canvas-operation-output-tab"]')).toBe(tab);
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(control);
      if (gesture === 'include') {
        expect(control.getAttribute('data-included')).toBe('false');
      } else {
        expect(container.querySelectorAll('[data-slot="relation-output-field"]')[1]).toBe(control);
      }
    }
  );
  it.each(
    ['postgres', 'duckdb'].flatMap((provider) =>
      ['submit', 'cancel', 'cancel-pending'].map((action) => ({ provider, action }))
    )
  )(
    '$action respects input identity and the draft boundary on $provider',
    async ({ action, provider }) => {
      const source = (table: string): Parameters<typeof createCustomerOrdersJoin>[0]['left'] => ({
        nodeId: table,
        schema: 'raw',
        table,
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1' as const,
          sourceObjectId: `relation/dvt/raw/${table}`,
          connectionRef: {
            schemaVersion: 'connection-ref.v1' as const,
            connectionId: 'warehouse',
            provider: 'postgres',
          },
        },
      });
      const document = createCustomerOrdersJoin({
        left: source('orders'),
        right: source('customers'),
        targetNodeId: 'model',
      });
      for (const relation of document.sidecar.relations) {
        if (relation.sourceRef != null) relation.sourceRef.connectionRef.provider = provider;
      }
      const selectedId = document.sidecar.relations.find(
        (entry) => entry.sourceRef != null
      )!.relationId;
      const onChange = vi.fn();
      const onClose = vi.fn();
      let analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
      function Form(): React.JSX.Element | null {
        const selected = useSelectedRelationTool(selectedId, 'filter', 'insert');
        return selected == null ? null : (
          <CanvasRelationalTreeOperatorForm
            inline
            tool={selected.tool}
            draft={document}
            title="Filter"
            targetRelationId={selectedId}
            onChange={onChange}
            onClose={onClose}
          />
        );
      }
      function Host(): React.JSX.Element {
        analysis = useCanvasRelationAnalysisSession(document, 'model');
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            <Form />
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () =>
        root.render(
          <React.StrictMode>
            <Host />
          </React.StrictMode>
        )
      );
      await waitFor(() => expect(container.querySelector('select')).not.toBeNull());
      const fields = [...container.querySelectorAll<HTMLSelectElement>('select')][0]!;
      expect([...fields.options].map((option) => option.value)).toEqual(
        document.sidecar.fields
          .filter((field) => field.relationId === selectedId)
          .map((field) => field.fieldId)
      );
      await act(async () =>
        fireEvent.change(container.querySelector('input')!, { target: { value: 'active' } })
      );
      expect(onChange).not.toHaveBeenCalled();
      await act(async () => {
        if (action !== 'cancel') fireEvent.submit(container.querySelector('form')!);
        if (action !== 'submit') fireEvent.click(container.querySelector('button[type="button"]')!);
      });
      expect(onClose).toHaveBeenCalledOnce();
      if (action === 'submit') {
        expect(onChange).toHaveBeenCalledOnce();
        const indexed = indexSubstraitRelations(onChange.mock.calls[0]![0]);
        if (!indexed.ok) throw indexed.error;
        const filter = [...indexed.index.relations.values()].find(
          (entry) => entry.relation.relType.case === 'filter'
        )!;
        expect(filter.inputs).toEqual([selectedId]);
      } else {
        expect(onChange).not.toHaveBeenCalled();
        expect(analysis!.session.revision).toBe(0);
      }
    }
  );
});
