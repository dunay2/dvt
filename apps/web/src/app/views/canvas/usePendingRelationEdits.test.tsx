// @vitest-environment jsdom
/** Pending child edits must reach the navigation owner in the same interaction. */
import { act, createRef, forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePendingRelationEdits } from './usePendingRelationEdits';

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => vi.unstubAllGlobals());

it('aggregates independent drafts without an intermediate clean state', () => {
  const onChange = vi.fn();
  const handle = createRef<ReturnType<typeof usePendingRelationEdits>>();
  const Harness = forwardRef<ReturnType<typeof usePendingRelationEdits>>((_, ref) => {
    const pending = usePendingRelationEdits(onChange);
    useImperativeHandle(ref, () => pending);
    return null;
  });
  const root = createRoot(document.createElement('div'));
  try {
    act(() => root.render(<Harness ref={handle} />));
    onChange.mockClear();
    act(() => {
      handle.current![0](true);
      expect(onChange).toHaveBeenLastCalledWith(true);
      handle.current![1](true);
      handle.current![0](false);
      expect(onChange.mock.calls).toEqual([[true]]);
    });
    act(() => handle.current![1](false));
    expect(onChange.mock.calls).toEqual([[true], [false]]);
    act(() => handle.current![0](true));
  } finally {
    act(() => root.unmount());
  }
  expect(onChange).toHaveBeenLastCalledWith(false);
});
