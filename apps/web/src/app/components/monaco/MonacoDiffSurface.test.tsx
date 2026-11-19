// @vitest-environment jsdom
/** Prove a read-only comparison cancels native work before releasing its models. */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import MonacoDiffSurface from './MonacoDiffSurface';

const useMonaco = vi.hoisted(() => vi.fn());
vi.mock('@monaco-editor/react', () => ({ useMonaco }));
vi.mock('./monacoLocalWorkers', () => ({ configureMonacoLocalWorkers: vi.fn() }));

it('retains the comparison editor across revisions and cancels work before disposing its inputs', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const root = createRoot(document.createElement('div'));
  const teardown: string[] = [];
  const source = (
    label: string
  ): {
    getLanguageId: () => string;
    getValue: () => string;
    setValue: ReturnType<typeof vi.fn>;
    dispose: () => void;
  } => ({
    getLanguageId: () => 'plaintext',
    getValue: () => '',
    setValue: vi.fn(),
    dispose: () => {
      teardown.push(label);
    },
  });
  const models = { original: source('original'), modified: source('modified') };
  const viewModel = {
    model: models,
    dispose: () => {
      teardown.push('cancel');
    },
  };
  const editor = {
    createViewModel: vi.fn().mockReturnValue(viewModel),
    getModel: () => models,
    updateOptions: vi.fn(),
    setModel: (model: typeof viewModel | null) => {
      if (model === null) teardown.push('detach');
    },
    dispose: () => {
      teardown.push('editor');
    },
  };
  const monaco = {
    editor: {
      createDiffEditor: vi.fn().mockReturnValue(editor),
      createModel: vi
        .fn()
        .mockReturnValueOnce(models.original)
        .mockReturnValueOnce(models.modified),
      setModelLanguage: vi.fn(),
      setTheme: vi.fn(),
      defineTheme: vi.fn(),
    },
  };
  useMonaco.mockReturnValue(monaco);
  const props = { ariaLabel: 'SQL diff', language: 'sql', original: 'select 1;' };
  try {
    await act(async () => root.render(<MonacoDiffSurface {...props} modified="select 2;" />));
    await act(async () => root.render(<MonacoDiffSurface {...props} modified="select 3;" />));
    expect(monaco.editor.createDiffEditor).toHaveBeenCalledTimes(1);
    expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
      'dvt-dark',
      expect.objectContaining({ base: 'vs-dark' })
    );
    expect(editor.updateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ ariaLabel: 'SQL diff', readOnly: true, originalEditable: false })
    );
    expect(models.modified.setValue).toHaveBeenLastCalledWith('select 3;');
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
  expect(teardown).toEqual(['detach', 'cancel', 'editor', 'original', 'modified']);
});
