// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act, useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';

const documents = {
  join: () =>
    createCustomerOrdersJoin({
      left: source('left'),
      right: source('right'),
      targetNodeId: 'model',
    }),
  set: () =>
    createSourceSet({
      inputs: [source('left'), source('right'), source('third')],
      targetNodeId: 'model',
    }),
};

describe.each(Object.entries(documents))(
  '%s selected relation outputs',
  (_kind, createDocument) => {
    setupWorkbenchTest();
    const outputs = (): HTMLInputElement[] => [
      ...container.querySelectorAll<HTMLInputElement>('[data-slot="relation-output-field"] input'),
    ];
    const setup = async (): Promise<ReturnType<typeof vi.fn>> => {
      const initial = createDocument();
      const onChange = vi.fn();
      function Host(): ReactElement {
        const [draft, setDraft] = useState(initial);
        const analysis = useCanvasRelationAnalysisSession(draft, 'model');
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            {analysis?.error == null && analysis?.document != null ? (
              <CanvasRelationOutputs
                relationId={analysis.session.rootId}
                disabled={false}
                onChange={(next) => {
                  onChange(next);
                  setDraft(next);
                }}
              />
            ) : null}
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () => root.render(<Host />));
      return onChange;
    };

    it('keeps invalid text local, reports it accessibly and accepts a corrected alias', async () => {
      const onChange = await setup();
      for (const invalid of ['x'.repeat(63) + ' ', 'invalid\0identifier']) {
        await act(async () => {
          fireEvent.input(outputs()[0]!, { target: { value: invalid } });
          fireEvent.focusOut(outputs()[0]!);
        });
        expect(outputs()[0]!.value).toBe(invalid);
        expect(outputs()[0]!.getAttribute('aria-invalid')).toBe('true');
        const errorId = outputs()[0]!.getAttribute('aria-describedby');
        expect(document.getElementById(errorId!)?.textContent).toBeTruthy();
        expect(onChange).not.toHaveBeenCalled();
      }
      await act(async () => {
        fireEvent.input(outputs()[0]!, { target: { value: 'key_alias' } });
        fireEvent.focusOut(outputs()[0]!);
      });
      expect(outputs()[0]!.getAttribute('aria-invalid')).toBeNull();
      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange.mock.calls[0]![0].sidecar.fields).toEqual(
        expect.arrayContaining([expect.objectContaining({ displayName: 'key_alias' })])
      );
    });

    it('rejects duplicate aliases and excludes an output without applying its invalid name', async () => {
      const onChange = await setup();
      const count = container.querySelectorAll('[data-included="true"]').length;
      await act(async () => {
        fireEvent.input(outputs()[0]!, { target: { value: outputs()[1]!.value } });
        fireEvent.focusOut(outputs()[0]!);
      });
      expect(outputs()[0]!.getAttribute('aria-invalid')).toBe('true');
      expect(onChange).not.toHaveBeenCalled();
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="relation-output-toggle"]')!)
      );
      expect(onChange).toHaveBeenCalledOnce();
      expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
      expect(container.querySelectorAll('[data-included="true"]')).toHaveLength(count - 1);
    });

    it('keeps the activated output control mounted and focused', async () => {
      await setup();
      const toggle = container.querySelector<HTMLButtonElement>(
        '[data-slot="relation-output-toggle"]'
      )!;
      toggle.focus();
      await act(async () => fireEvent.click(toggle));
      expect(toggle.isConnected).toBe(true);
      expect(document.activeElement).toBe(toggle);
    });
  }
);
