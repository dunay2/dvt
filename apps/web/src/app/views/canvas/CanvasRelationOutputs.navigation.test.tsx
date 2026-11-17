// @vitest-environment jsdom
/** Prove navigation and retained-surface hiding preserve pending aliases without publishing. */
import { act, useState, type ReactElement } from 'react';
import { fireEvent } from '@testing-library/dom';
import { expect, it, vi } from 'vitest';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';

setupWorkbenchTest();
it.each(['navigation', 'hidden', 'inert'] as const)(
  'retains the alias across %s and accepts ordinary blur',
  async (boundary) => {
    const initial = createCustomerOrdersJoin({
      left: source('left'),
      right: source('right'),
      targetNodeId: 'model',
    });
    const publish = vi.fn();
    function Host(): ReactElement {
      const [draft, setDraft] = useState(initial);
      const analysis = useCanvasRelationAnalysisSession(draft, 'model');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          {analysis?.document == null ? null : (
            <CanvasRelationOutputs
              relationId={analysis.session.rootId}
              disabled={false}
              onChange={(next) => {
                publish(next);
                setDraft(next);
              }}
            />
          )}
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    const input = container.querySelector<HTMLInputElement>(
      '[data-slot="relation-output-field"] input'
    )!;
    const target = document.createElement('button');
    document.body.append(target);
    try {
      if (boundary === 'navigation') target.setAttribute('data-workbench-navigation', '');
      else container.setAttribute(boundary, '');
      await act(async () => {
        fireEvent.input(input, { target: { value: 'pending_alias' } });
        fireEvent.focusOut(input, { relatedTarget: target });
      });
      expect(input.value).toBe('pending_alias');
      expect(publish).not.toHaveBeenCalled();
      target.removeAttribute('data-workbench-navigation');
      container.removeAttribute('hidden');
      container.removeAttribute('inert');
      await act(async () => fireEvent.focusOut(input, { relatedTarget: target }));
      expect(publish).toHaveBeenCalledOnce();
    } finally {
      target.remove();
      container.removeAttribute('hidden');
      container.removeAttribute('inert');
    }
  }
);
