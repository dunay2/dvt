/** Owned concern: map explicit Canvas dock resize gestures to usable panel dimensions. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ImperativePanelHandle } from '../../components/ui/resizable';

const RESIZE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']);
const COMPACT_WIDTH_PX = 192;
const MINIMUM_WIDTH_PERCENT_CAP = 15;

export function useCanvasSideDockResize({
  groupId,
  expanded,
  width,
  pixels = false,
  maxSize,
  onWidthChange,
  onCollapse,
}: Readonly<{
  groupId: string;
  expanded: boolean;
  width: number;
  pixels?: boolean;
  maxSize: number;
  onWidthChange: (width: number) => void;
  onCollapse: () => void | boolean | Promise<void | boolean>;
}>) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const input = useRef<'pointer' | 'keyboard'>();
  const pendingClose = useRef(false);
  const [groupWidth, setGroupWidth] = useState(0);
  const minSize =
    groupWidth > 0 ? Math.min(MINIMUM_WIDTH_PERCENT_CAP, (COMPACT_WIDTH_PX / groupWidth) * 100) : 0;
  const pixelSize = groupWidth > 0 ? (width / groupWidth) * 100 : maxSize;
  const preferredSize = pixels ? pixelSize : width;
  const size = Math.min(maxSize, Math.max(minSize, preferredSize));

  useLayoutEffect(() => {
    const group = document.getElementById(groupId);
    if (group == null) return;
    const measure = (): void => setGroupWidth(group.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, [groupId]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!expanded || pendingClose.current) return;
    if (input.current != null || panel == null) return;
    if (Math.abs(panel.getSize() - size) > 0.01) panel.resize(size);
  }, [expanded, size]);

  const onDragging = useCallback((dragging: boolean): void => {
    input.current = dragging ? 'pointer' : undefined;
  }, []);
  const finishKeyboardResize = (): void => {
    if (input.current === 'keyboard') input.current = undefined;
  };

  function canCommitGesture(): boolean {
    return expanded && input.current != null && !pendingClose.current;
  }

  function commitResize(nextSize: number, previousSize: number | undefined): void {
    if (!canCommitGesture()) return;
    if (previousSize === undefined || nextSize <= 0) return;
    if (!pixels) {
      onWidthChange(nextSize);
      return;
    }
    if (groupWidth > 0) onWidthChange((nextSize / 100) * groupWidth);
  }

  async function settleCollapse(panel: ImperativePanelHandle | null): Promise<void> {
    let accepted: void | boolean;
    try {
      accepted = await onCollapse();
    } catch {
      accepted = false;
    }
    try {
      if (accepted !== false || panel == null) return;
      if (panelRef.current === panel) panel.resize(size);
    } finally {
      pendingClose.current = false;
    }
  }

  function commitCollapse(): void {
    if (!canCommitGesture()) return;
    input.current = undefined;
    pendingClose.current = true;
    void settleCollapse(panelRef.current);
  }

  return {
    groupId,
    panelRef,
    size,
    minSize,
    maxSize,
    onResize: commitResize,
    onCollapse: commitCollapse,
    handle: {
      className:
        'w-[2px] bg-(--border-subtle) hover:bg-(--focus-ring) data-[resize-handle-state=drag]:bg-(--focus-ring)',
      onDragging,
      onKeyDownCapture: (
        event: Readonly<Pick<KeyboardEvent, 'key' | 'defaultPrevented'>>
      ): void => {
        if (!event.defaultPrevented && RESIZE_KEYS.has(event.key)) input.current = 'keyboard';
      },
      onKeyUpCapture: finishKeyboardResize,
      onBlur: finishKeyboardResize,
    },
  };
}
