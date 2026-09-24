// @vitest-environment jsdom
import React, { act } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

describe('selected Filter form', () => {
  setupWorkbenchTest();
  it.each(
    ['postgres', 'duckdb'].flatMap((provider) =>
      ['submit', 'cancel', 'cancel-pending'].map((action) => ({ provider, action }))
    )
  )(
    '$action respects input identity and the draft boundary on $provider',
    async ({ action, provider }) => {
      const source = (
        table: string
      ): Parameters<typeof createDvtSubstraitJoinDraft>[0]['left'] => ({
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
      const document = createDvtSubstraitJoinDraft({
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
