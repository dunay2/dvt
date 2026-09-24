// @vitest-environment jsdom

import { fireEvent, getByRole } from '@testing-library/dom';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import { inspectCanvasDvtSubstraitSortFetch } from './canvasSortFetch.test-support';
import { RelationAnalysisTestHost, SelectedUnaryTestForm } from './SelectedUnaryForm.test-support';
import { resolveDvtSubstraitSortFetchInputFields } from './canvasSortFetch.test-support';

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

  const render = (
    form: React.ReactElement<{ draft: Parameters<typeof RelationAnalysisTestHost>[0]['document'] }>
  ): void => {
    root.render(
      <RelationAnalysisTestHost document={form.props.draft}>{form}</RelationAnalysisTestHost>
    );
  };

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('submits exact i64 LIMIT/OFFSET values without converting through number', async () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'orders',
      targetNodeId: 'model',
    });
    const onChange = vi.fn();
    const onClose = vi.fn();
    await act(async () => {
      render(
        <SelectedUnaryTestForm
          operation="fetch"
          draft={draft}
          title="LIMIT / OFFSET"
          onChange={onChange}
          onClose={onClose}
        />
      );
    });
    const inputs = container.querySelectorAll<HTMLInputElement>('input');
    await act(async () => {
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
    async (invalid) => {
      const draft = createDvtSubstraitPilotDraft({
        sourceNodeId: 'orders',
        targetNodeId: 'model',
      });
      const onChange = vi.fn();
      const onClose = vi.fn();
      await act(async () => {
        render(
          <SelectedUnaryTestForm
            operation="fetch"
            draft={draft}
            title="LIMIT / OFFSET"
            onChange={onChange}
            onClose={onClose}
          />
        );
      });
      await act(async () => {
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
    const onChange = vi.fn();
    const onClose = vi.fn();
    const props = { operation: 'fetch' as const, draft, title: 'LIMIT', onChange, onClose };
    await act(async () => render(<SelectedUnaryTestForm {...props} />));
    const limit = container.querySelectorAll<HTMLInputElement>('input')[1]!;
    await act(() => fireEvent.change(limit, { target: { value: '42' } }));
    await act(async () => render(<SelectedUnaryTestForm {...props} title="Selected operation" />));
    expect(container.querySelectorAll('input')[1]).toBe(limit);
    expect(limit.value).toBe('42');
    expect(onChange).not.toHaveBeenCalled();
    act(() => getByRole(container, 'button', { name: /Cancel/ }).click());
    expect(onClose).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(JSON.stringify(draft)).toBe(before);
  });

  it('submits ordered multi-key sorting and rejects duplicate keys before recovery', async () => {
    const draft = createDvtSubstraitPilotDraft({ sourceNodeId: 'orders', targetNodeId: 'model' });
    const before = JSON.stringify(draft);
    const fields = resolveDvtSubstraitSortFetchInputFields(draft);
    expect(fields.length).toBeGreaterThan(1);
    const onChange = vi.fn();
    const onClose = vi.fn();
    await act(async () =>
      render(
        <SelectedUnaryTestForm
          operation="sort"
          draft={draft}
          title="ORDER BY"
          onChange={onChange}
          onClose={onClose}
        />
      )
    );
    act(() => getByRole(container, 'button', { name: /Add key|Añadir clave/ }).click());
    const controls = container.querySelectorAll('select');
    await act(() => fireEvent.change(controls[2]!, { target: { value: fields[0]!.fieldId } }));
    await act(() => fireEvent.submit(container.querySelector('form')!));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.change(controls[2]!, { target: { value: fields[1]!.fieldId } });
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
        { fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.DESC_NULLS_FIRST },
        { fieldId: fields[1]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST },
      ],
    });
    expect(JSON.stringify(draft)).toBe(before);
  });
});
