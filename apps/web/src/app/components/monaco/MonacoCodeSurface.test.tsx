// @vitest-environment jsdom
/** Read-only surfaces must not expose mutable editor handles to their callers. */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import MonacoCodeSurface from './MonacoCodeSurface';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@monaco-editor/react', () => ({
  default: (props: unknown) => {
    capture(props);
    return null;
  },
  useMonaco: () => null,
}));
vi.mock('./monacoLocalWorkers', () => ({ configureMonacoLocalWorkers: vi.fn() }));

describe('shared Monaco edit boundary', () => {
  it('withholds the mount callback and change handler in readonly mode while retaining editable support', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const element = document.createElement('div');
    const root = createRoot(element);
    const onMount = vi.fn();
    const onChange = vi.fn();
    const props = { ariaLabel: 'Formula', language: 'dvt-formula', value: '1', onMount, onChange };
    try {
      await act(async () => root.render(<MonacoCodeSurface {...props} readOnly />));
      expect(capture.mock.lastCall?.[0]).toMatchObject({
        onMount: undefined,
        onChange: undefined,
        options: { readOnly: true, domReadOnly: true },
      });
      await act(async () => root.render(<MonacoCodeSurface {...props} readOnly={false} />));
      expect(capture.mock.lastCall?.[0]).toMatchObject({ onMount, options: { readOnly: false } });
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
