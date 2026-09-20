// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import { inspectCanvasDvtSubstraitSortFetch } from './canvasDvtSubstraitSortFetch';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';

describe('CanvasRelationalTreeOperatorForm Sort/Fetch editing', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('submits exact i64 LIMIT/OFFSET values without converting through number', () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'orders',
      targetNodeId: 'model',
    });
    const tool = resolveCanvasRelationalOperatorTools(draft).find((item) => item.id === 'fetch')!;
    const onChange = vi.fn();
    const onClose = vi.fn();
    act(() => {
      root.render(
        <CanvasRelationalTreeOperatorForm
          inline
          tool={tool}
          draft={draft}
          title="LIMIT / OFFSET"
          onChange={onChange}
          onClose={onClose}
        />
      );
    });
    const inputs = container.querySelectorAll<HTMLInputElement>('input');
    act(() => {
      fireEvent.change(inputs[0]!, { target: { value: '9007199254740993' } });
      fireEvent.change(inputs[1]!, { target: { value: '9223372036854775807' } });
      fireEvent.submit(container.querySelector('form')!);
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(inspectCanvasDvtSubstraitSortFetch(onChange.mock.calls[0]![0])).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: 9_007_199_254_740_993n,
      count: 9_223_372_036_854_775_807n,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the draft open and visible when a fraction is entered', () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'orders',
      targetNodeId: 'model',
    });
    const tool = resolveCanvasRelationalOperatorTools(draft).find((item) => item.id === 'fetch')!;
    const onChange = vi.fn();
    const onClose = vi.fn();
    act(() => {
      root.render(
        <CanvasRelationalTreeOperatorForm
          inline
          tool={tool}
          draft={draft}
          title="LIMIT / OFFSET"
          onChange={onChange}
          onClose={onClose}
        />
      );
    });
    act(() => {
      fireEvent.change(container.querySelectorAll<HTMLInputElement>('input')[1]!, {
        target: { value: '1.5' },
      });
      fireEvent.submit(container.querySelector('form')!);
    });

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
