// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasStagedOperationInspector } from './CanvasStagedOperationInspector';
import { graphModel } from './canvasRelationGraph.test-support';

describe('CanvasStagedOperationInspector', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows properties and both Input states for a selected pending JOIN', () => {
    act(() => {
      root.render(
        <CanvasStagedOperationInspector
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
});
