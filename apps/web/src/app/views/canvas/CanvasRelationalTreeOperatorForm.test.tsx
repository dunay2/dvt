// @vitest-environment jsdom

import { fireEvent, getByRole } from '@testing-library/dom';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
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

  it.each(['1.5', '-1', '9223372036854775808', 'invalid'])(
    'rejects invalid LIMIT %s without closing or changing the canonical draft',
    (invalid) => {
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
          target: { value: invalid },
        });
        fireEvent.submit(container.querySelector('form')!);
      });

      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    }
  );

  it('retains unsaved input across parent renders and cancels without mutation', async () => {
    const draft = createDvtSubstraitPilotDraft({ sourceNodeId: 'orders', targetNodeId: 'model' });
    const before = JSON.stringify(draft);
    const tool = resolveCanvasRelationalOperatorTools(draft).find((item) => item.id === 'fetch')!;
    const onChange = vi.fn();
    const onClose = vi.fn();
    const props = { inline: true, tool, draft, title: 'LIMIT', onChange, onClose };
    await act(() => root.render(<CanvasRelationalTreeOperatorForm {...props} />));
    const limit = container.querySelectorAll<HTMLInputElement>('input')[1]!;
    await act(() => fireEvent.change(limit, { target: { value: '42' } }));
    await act(() =>
      root.render(<CanvasRelationalTreeOperatorForm {...props} title="Selected operation" />)
    );
    expect(container.querySelectorAll('input')[1]).toBe(limit);
    expect(limit.value).toBe('42');
    expect(onChange).not.toHaveBeenCalled();
    await act(() => getByRole(container, 'button', { name: /Cancel/ }).click());
    expect(onClose).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(JSON.stringify(draft)).toBe(before);
  });

  it('submits ordered multi-key sorting and rejects duplicate keys before recovery', async () => {
    const draft = createDvtSubstraitPilotDraft({ sourceNodeId: 'orders', targetNodeId: 'model' });
    const before = JSON.stringify(draft);
    const tool = resolveCanvasRelationalOperatorTools(draft).find((item) => item.id === 'sort')!;
    expect(tool.fields.length).toBeGreaterThan(1);
    const onChange = vi.fn();
    const onClose = vi.fn();
    await act(() =>
      root.render(
        <CanvasRelationalTreeOperatorForm
          inline
          tool={tool}
          draft={draft}
          title="ORDER BY"
          onChange={onChange}
          onClose={onClose}
        />
      )
    );
    await act(() => getByRole(container, 'button', { name: /Add key|Añadir clave/ }).click());
    const controls = container.querySelectorAll('select');
    await act(() => fireEvent.change(controls[2]!, { target: { value: tool.fields[0]!.fieldId } }));
    await act(() => fireEvent.submit(container.querySelector('form')!));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await act(() => {
      fireEvent.change(controls[2]!, { target: { value: tool.fields[1]!.fieldId } });
      fireEvent.change(controls[1]!, {
        target: { value: SortField_SortDirection.DESC_NULLS_FIRST },
      });
    });
    await act(() => fireEvent.submit(container.querySelector('form')!));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(inspectCanvasDvtSubstraitSortFetch(onChange.mock.calls[0]![0])).toMatchObject({
      ok: true,
      operation: 'sort',
      keys: [
        { fieldId: tool.fields[0]!.fieldId, direction: SortField_SortDirection.DESC_NULLS_FIRST },
        { fieldId: tool.fields[1]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST },
      ],
    });
    expect(JSON.stringify(draft)).toBe(before);
  });
});
