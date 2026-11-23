// @vitest-environment jsdom
import { act, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { ImperativePanelHandle } from '../../components/ui/resizable';
import { useCanvasSideDockResize } from './useCanvasSideDockResize';

it('restores the current dock after a rejected close and admits the next resize gesture', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const onCollapse = vi.fn().mockRejectedValueOnce(new Error('Close rejected'));
  const onWidthChange = vi.fn();
  let adapter: ReturnType<typeof useCanvasSideDockResize>;
  const panel: ImperativePanelHandle = {
    getId: () => 'inspector',
    getSize: () => 25,
    isCollapsed: () => false,
    isExpanded: () => true,
    collapse: vi.fn(),
    expand: vi.fn(),
    resize: vi.fn((next) => adapter.onResize(next, 25)),
  };
  function DockHarness(): null {
    adapter = useCanvasSideDockResize({
      groupId: 'canvas-panels',
      expanded: true,
      width: 25,
      maxSize: 70,
      onWidthChange,
      onCollapse,
    });
    useImperativeHandle(adapter.panelRef, () => panel, []);
    return null;
  }

  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<DockHarness />));
    await act(async () => {
      adapter.handle.onDragging(true);
      adapter.onCollapse();
      adapter.handle.onDragging(true);
      adapter.onResize(32, 25);
    });
    expect(onCollapse).toHaveBeenCalledOnce();
    expect(panel.resize).toHaveBeenCalledWith(25);
    expect(onWidthChange).not.toHaveBeenCalled();

    act(() => {
      adapter.handle.onDragging(true);
      adapter.onResize(35, 25);
    });
    expect(onWidthChange).toHaveBeenCalledExactlyOnceWith(35);
  } finally {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
