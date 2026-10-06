// @vitest-environment jsdom
/** Read-only surfaces must not expose mutable editor handles to their callers. */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import MonacoCodeSurface from './MonacoCodeSurface';
import MonacoDiffSurface from './MonacoDiffSurface';

const capture = vi.hoisted(() => ({ code: vi.fn(), diff: vi.fn() }));
vi.mock('@monaco-editor/react', () => ({
  default: (props: unknown) => {
    capture.code(props);
    return null;
  },
  DiffEditor: (props: unknown) => {
    capture.diff(props);
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
      expect(capture.code.mock.lastCall?.[0]).toMatchObject({
        onMount: undefined,
        onChange: undefined,
        options: { readOnly: true, domReadOnly: true },
      });
      await act(async () => root.render(<MonacoCodeSurface {...props} readOnly={false} />));
      expect(capture.code.mock.lastCall?.[0]).toMatchObject({
        onMount,
        options: { readOnly: false },
      });
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });

  it('registers the shared SQL palette before mounting readonly, editable and diff surfaces', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const root = createRoot(document.createElement('div'));
    const sql = "select '30 days'";
    const codeProps = { ariaLabel: 'SQL', language: 'sql', value: sql };
    const surfaces = [
      [<MonacoCodeSurface {...codeProps} readOnly />, capture.code],
      [<MonacoCodeSurface {...codeProps} readOnly={false} />, capture.code],
      [
        <MonacoDiffSurface ariaLabel="SQL diff" language="sql" original={sql} modified={sql} />,
        capture.diff,
      ],
    ] as const;
    try {
      for (const [surface, capturedProps] of surfaces) {
        capturedProps.mockClear();
        await act(async () => root.render(surface));
        const defineTheme = vi.fn();
        const monaco = { editor: { defineTheme } };
        const props = capturedProps.mock.lastCall?.[0] as {
          theme: string;
          beforeMount: (instance: typeof monaco) => void;
        };
        expect(props).toMatchObject({ theme: 'dvt-dark', beforeMount: expect.any(Function) });
        props.beforeMount(monaco);
        expect(defineTheme).toHaveBeenCalledExactlyOnceWith('dvt-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [{ token: 'string.sql', foreground: 'CE9178' }],
          colors: {},
        });
      }
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
