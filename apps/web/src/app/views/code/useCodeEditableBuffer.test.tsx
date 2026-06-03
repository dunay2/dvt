import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { useCodeEditableBuffer } from './useCodeEditableBuffer';

type EditableFile = {
  readonly path: string;
  readonly content: string;
};

function EditableBufferHarness({ file }: { readonly file: EditableFile }): JSX.Element {
  const buffer = useCodeEditableBuffer(file);

  return (
    <>
      <textarea
        data-testid="code-editable-buffer"
        readOnly
        value={buffer.value}
        title="Code buffer"
        placeholder="Code content"
      />
      <button
        type="button"
        onClick={() => buffer.updateValue('select 2 as edited')}
        title="Edit code"
      >
        edit
      </button>
    </>
  );
}

describe('useCodeEditableBuffer', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }

    container?.remove();
    root = null;
    container = null;
  });

  function renderHarness(file: EditableFile): HTMLTextAreaElement {
    container ??= document.createElement('div');
    if (!container.isConnected) {
      document.body.appendChild(container);
    }
    root ??= createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    act(() => {
      root?.render(<EditableBufferHarness file={file} />);
    });

    const editor = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="code-editable-buffer"]'
    );

    if (!editor) {
      throw new Error('expected editable buffer harness');
    }

    return editor;
  }

  it('starts from file content and then keeps local edits by file path', () => {
    const editor = renderHarness({ path: 'models/a.sql', content: 'select 1' });
    expect(editor.value).toBe('select 1');

    const editButton = container?.querySelector<HTMLButtonElement>('button');
    if (!editButton) {
      throw new Error('expected edit button');
    }

    act(() => {
      editButton.click();
    });

    expect(editor.value).toBe('select 2 as edited');

    const secondEditor = renderHarness({ path: 'models/b.sql', content: 'select 3' });
    expect(secondEditor.value).toBe('select 3');

    const restoredEditor = renderHarness({ path: 'models/a.sql', content: 'select 1' });
    expect(restoredEditor.value).toBe('select 2 as edited');
  });
});
