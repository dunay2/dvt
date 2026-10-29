// @vitest-environment jsdom
/** Read-only surfaces must not expose mutable editor handles to their callers. */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import MonacoCodeSurface from './MonacoCodeSurface';
import MonacoDiffSurface from './MonacoDiffSurface';
import type { MonacoCodeEditorMount } from './MonacoCodeEditor';

const capture = vi.hoisted(() => ({
  code: vi.fn(),
  diff: vi.fn(),
  attach: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('./monacoInlineReferences', () => ({
  attachMonacoInlineReferences: capture.attach,
}));
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
  it('withholds external mutable handles and changes in readonly mode while retaining editable support', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const element = document.createElement('div');
    const root = createRoot(element);
    const onMount = vi.fn();
    const onChange = vi.fn();
    const instance = {} as Parameters<MonacoCodeEditorMount>[0];
    const api = {} as Parameters<MonacoCodeEditorMount>[1];
    const props = { ariaLabel: 'Formula', language: 'dvt-formula', value: '1', onMount, onChange };
    try {
      await act(async () => root.render(<MonacoCodeSurface {...props} readOnly />));
      expect(capture.code.mock.lastCall?.[0]).toMatchObject({
        onChange: undefined,
        options: { readOnly: true, domReadOnly: true },
      });
      const readonlyMount = capture.code.mock.lastCall?.[0].onMount as MonacoCodeEditorMount;
      await act(async () => readonlyMount(instance, api));
      expect(onMount).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
      await act(async () => root.render(<MonacoCodeSurface {...props} readOnly={false} />));
      expect(capture.code.mock.lastCall?.[0]).toMatchObject({
        options: { readOnly: false },
      });
      const editableMount = capture.code.mock.lastCall?.[0].onMount as MonacoCodeEditorMount;
      await act(async () => editableMount(instance, api));
      expect(onMount).toHaveBeenCalledExactlyOnceWith(instance, api);
      capture.code.mock.lastCall?.[0].onChange('2');
      expect(onChange).toHaveBeenCalledExactlyOnceWith('2');
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });

  it('keeps passive references mounted across inspector callbacks and cleans them when invalidated', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    capture.attach.mockClear().mockReturnValue({ dispose: capture.dispose });
    capture.dispose.mockClear();
    const root = createRoot(document.createElement('div'));
    const projection = { path: 'models/client.sql', value: 'select 1', items: [] };
    const firstInspect = vi.fn();
    const nextInspect = vi.fn();
    const props = { ariaLabel: 'SQL', language: 'sql', value: projection.value, readOnly: true };
    try {
      await act(async () =>
        root.render(
          <MonacoCodeSurface
            {...props}
            inlineReferences={projection}
            onInspectReference={firstInspect}
          />
        )
      );
      const mount = capture.code.mock.lastCall?.[0].onMount as MonacoCodeEditorMount;
      await act(async () =>
        mount(
          {} as Parameters<MonacoCodeEditorMount>[0],
          {} as Parameters<MonacoCodeEditorMount>[1]
        )
      );
      expect(capture.attach).toHaveBeenCalledTimes(1);
      const inspect = capture.attach.mock.lastCall?.[3] as (id: string) => void;
      inspect('client');
      expect(firstInspect).toHaveBeenCalledExactlyOnceWith('client');
      await act(async () =>
        root.render(
          <MonacoCodeSurface
            {...props}
            inlineReferences={projection}
            onInspectReference={nextInspect}
          />
        )
      );
      expect(capture.attach).toHaveBeenCalledTimes(1);
      expect(capture.dispose).not.toHaveBeenCalled();
      inspect('client');
      expect(nextInspect).toHaveBeenCalledExactlyOnceWith('client');
      await act(async () => root.render(<MonacoCodeSurface {...props} />));
      expect(capture.dispose).toHaveBeenCalledTimes(1);
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
          colors: {
            'editor.wordHighlightBackground': '#00000040',
            'editor.wordHighlightBorder': '#707070',
          },
        });
      }
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
