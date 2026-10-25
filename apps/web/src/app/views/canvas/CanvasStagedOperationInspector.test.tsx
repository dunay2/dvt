// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasStagedOperationInspector } from './CanvasStagedOperationInspector';
import { graphModel } from './canvasRelationGraph.test-support';
import { stagedModelJoinFixture } from './stagedAnalysisContext.test-support';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

describe('CanvasStagedOperationInspector', () => {
  let container: HTMLDivElement;
  let root: Root;
  let language: ReturnType<typeof useApplicationLanguageStore.getState>['language'];

  beforeEach(() => {
    language = useApplicationLanguageStore.getState().language;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useApplicationLanguageStore.setState({ language });
  });

  it.each([
    ['en', 'Reconfigure JOIN'],
    ['es', 'Reconfigurar JOIN'],
  ] as const)(
    'offers explicit recovery in %s without changing configuration on inspection',
    (locale, label) => {
      useApplicationLanguageStore.setState({ language: locale });
      const fixture = stagedModelJoinFixture();
      const onReconfigure = vi.fn(() => false);
      const onUpdate = vi.fn();
      const { semanticDocument, ...pending } = fixture.staged;
      act(() =>
        root.render(
          <CanvasStagedOperationInspector
            binding={fixture.binding}
            staged={{ ...pending, configurationDocument: semanticDocument }}
            producerDocument={null}
            transformNode={graphModel()}
            copy={resolveCanvasViewCopy(locale)}
            onClose={vi.fn()}
            onPendingChange={vi.fn()}
            onUpdate={onUpdate}
            onReconfigure={onReconfigure}
          />
        )
      );
      const action = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-staged-operation-reconfigure"]'
      );
      expect(action?.textContent).toBe(label);
      expect(onReconfigure).not.toHaveBeenCalled();
      expect(onUpdate).not.toHaveBeenCalled();
      act(() => action!.click());
      expect(onReconfigure).toHaveBeenCalledTimes(1);
      expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
      expect(onUpdate).not.toHaveBeenCalled();
    }
  );

  it('shows properties and both Input states for a selected pending JOIN', () => {
    act(() => {
      root.render(
        <CanvasStagedOperationInspector
          binding={{
            inputs: [],
            readFieldEligibility: () => ({ denied: new Set(), disconnected: new Set() }),
          }}
          staged={{
            id: 'pending-operation:join',
            operation: 'inner_join',
            inputs: ['relation:orders', null],
          }}
          producerDocument={null}
          transformNode={graphModel()}
          copy={resolveCanvasViewCopy('en')}
          onClose={vi.fn()}
          onPendingChange={vi.fn()}
          onUpdate={vi.fn()}
        />
      );
    });

    const inspector = container.querySelector('[data-slot="canvas-staged-operation-inspector"]');
    expect(inspector?.textContent).toContain('Properties');
    expect(inspector?.textContent).toContain('INNER JOIN');
    expect(inspector?.textContent).toContain('Participating');
    expect(
      container.querySelectorAll('[data-slot="canvas-staged-operation-input-property"]')
    ).toHaveLength(2);
  });

  it('keeps recovery disabled until both JOIN inputs are connected', () => {
    const fixture = stagedModelJoinFixture();
    const { semanticDocument, ...staged } = fixture.staged;
    const onReconfigure = vi.fn(() => true);
    act(() =>
      root.render(
        <CanvasStagedOperationInspector
          binding={fixture.binding}
          staged={{
            ...staged,
            inputs: [staged.inputs[0]!, null],
            configurationDocument: semanticDocument,
          }}
          producerDocument={null}
          transformNode={graphModel()}
          copy={resolveCanvasViewCopy('en')}
          onClose={vi.fn()}
          onPendingChange={vi.fn()}
          onUpdate={vi.fn()}
          onReconfigure={onReconfigure}
        />
      )
    );
    const action = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-staged-operation-reconfigure"]'
    )!;
    expect(action.disabled).toBe(true);
    act(() => action.click());
    expect(onReconfigure).not.toHaveBeenCalled();
  });
});
