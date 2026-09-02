// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasColumnCommentEditor } from './CanvasColumnCommentEditor';

describe('CanvasColumnCommentEditor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('commits a changed comment on blur without a secondary action', () => {
    const onCommit = vi.fn();
    act(() => {
      root.render(
        <CanvasColumnCommentEditor
          fieldName="order_id"
          value=""
          disabled={false}
          label="Column comment"
          placeholder="Add a column comment"
          onCommit={onCommit}
        />
      );
    });
    const editor = container.querySelector<HTMLTextAreaElement>(
      '[data-slot="canvas-column-comment-editor"]'
    )!;

    act(() => {
      fireEvent.input(editor, { target: { value: 'Stable order identifier' } });
    });
    act(() => {
      fireEvent.focusOut(editor);
    });

    expect(onCommit).toHaveBeenCalledWith('Stable order identifier');
    expect(container.querySelector('button')).toBeNull();
  });

  it('does not emit an unchanged comment', () => {
    const onCommit = vi.fn();
    act(() => {
      root.render(
        <CanvasColumnCommentEditor
          fieldName="order_id"
          value="Stable order identifier"
          disabled={false}
          label="Column comment"
          placeholder="Add a column comment"
          onCommit={onCommit}
        />
      );
    });

    act(() => {
      fireEvent.focusOut(container.querySelector('textarea')!);
    });
    expect(onCommit).not.toHaveBeenCalled();
  });
});
