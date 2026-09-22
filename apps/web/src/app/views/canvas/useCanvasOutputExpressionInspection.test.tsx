// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, node } from './canvasOutputExpression.test.fixtures';
import { useCanvasOutputExpressionInspection } from './useCanvasOutputExpressionInspection';

describe('output inspector scope and focus', () => {
  let container: HTMLDivElement, root: Root, opener: HTMLButtonElement;
  let inspector: ReturnType<typeof useCanvasOutputExpressionInspection>;
  let frame: FrameRequestCallback;
  const transform = node(fixture());
  function Harness({
    canvasId = 'canvas',
    present = true,
  }: {
    canvasId?: string;
    present?: boolean;
  }): null {
    inspector = useCanvasOutputExpressionInspection(canvasId, present ? [transform] : []);
    return null;
  }
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 1;
    });
    container = document.createElement('div');
    opener = document.createElement('button');
    document.body.append(container, opener);
    root = createRoot(container);
    act(() => root.render(<Harness />));
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    opener.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const open = (): void =>
    act(() =>
      inspector.open({ nodeId: transform.id, fieldId: 'output:customer', anchorElement: opener })
    );
  it('opens a docked read-only inspector and returns focus to the output on close', async () => {
    open();
    expect(inspector.workbench).toMatchObject({ id: 'output-expression', presentation: 'docked' });
    await act(async () => {
      await inspector.workbench!.requestClose();
    });
    expect(inspector.workbench).toBeUndefined();
    act(() => frame(0));
    expect(document.activeElement).toBe(opener);
  });
  it('cannot inspect another canvas node or resurrect selection after switching canvases', () => {
    act(() =>
      inspector.open({ nodeId: 'foreign', fieldId: 'output:customer', anchorElement: opener })
    );
    expect(inspector.workbench).toBeUndefined();
    open();
    act(() => root.render(<Harness canvasId="other" />));
    expect(inspector.workbench).toBeUndefined();
    act(() => root.render(<Harness />));
    expect(inspector.workbench).toBeUndefined();
  });
  it('drops inspection when its canonical node is removed', () => {
    open();
    act(() => root.render(<Harness present={false} />));
    expect(inspector.workbench).toBeUndefined();
  });
  it('restores focus by FieldId when the Canvas has remounted the initiating card', async () => {
    open();
    opener.remove();
    const card = document.createElement('div');
    card.className = 'react-flow__node';
    card.dataset.id = transform.id;
    const replacement = document.createElement('button');
    replacement.dataset.slot = 'graph-node-column-piece';
    replacement.dataset.fieldId = 'output:customer';
    card.append(replacement);
    container.append(card);
    await act(async () => {
      await inspector.workbench!.requestClose();
    });
    act(() => frame(0));
    expect(document.activeElement).toBe(replacement);
  });
  it('does not steal focus from a newer interaction while closing', async () => {
    open();
    await act(async () => {
      await inspector.workbench!.requestClose();
    });
    const newer = document.createElement('button');
    container.append(newer);
    newer.focus();
    act(() => frame(0));
    expect(document.activeElement).toBe(newer);
  });
});
