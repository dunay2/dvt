/** Owned concern: apply the measured Explorer bounds and route explicit resize gestures. */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { ImperativePanelHandle } from '../../../components/ui/resizable';
import { CANVAS_EXPLORER_WIDTH } from '../../../stores/uiLayoutStore';

const COMPACT_WIDTH_PX = 192;
const MINIMUM_WIDTH_PERCENT_CAP = 15;
const RESIZE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']);

export function useCanvasExplorerResize({
  groupId,
  expanded,
  widthPercent,
  onWidthChange,
  onCollapse,
}: Readonly<{
  groupId: string;
  expanded: boolean;
  widthPercent: number;
  onWidthChange: (size: number) => void;
  onCollapse: () => void;
}>) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const input = useRef<'pointer' | 'keyboard'>();
  const [groupWidth, setGroupWidth] = useState(0);
  const minSize =
    groupWidth > 0 ? Math.min(MINIMUM_WIDTH_PERCENT_CAP, (COMPACT_WIDTH_PX / groupWidth) * 100) : 0;
  const size = Math.max(minSize, widthPercent);

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

  useEffect(() => {
    const panel = panelRef.current;
    if (
      expanded &&
      input.current == null &&
      panel != null &&
      Math.abs(panel.getSize() - size) > 0.01
    )
      panel.resize(size);
  }, [expanded, size]);

  const onDragging = useCallback((dragging: boolean): void => {
    input.current = dragging ? 'pointer' : undefined;
  }, []);
  const finishKeyboardResize = (): void => {
    if (input.current === 'keyboard') input.current = undefined;
  };
  return {
    groupId,
    panelRef,
    size,
    minSize,
    maxSize: CANVAS_EXPLORER_WIDTH.max,
    onResize: (nextSize: number, previousSize: number | undefined): void => {
      if (expanded && input.current != null && previousSize !== undefined && nextSize > 0)
        onWidthChange(nextSize);
    },
    onCollapse: (): void => {
      if (!expanded || input.current == null) return;
      input.current = undefined;
      onCollapse();
    },
    handle: {
      onDragging,
      onKeyDownCapture: (event: KeyboardEvent): void => {
        if (!event.defaultPrevented && RESIZE_KEYS.has(event.key)) input.current = 'keyboard';
      },
      onKeyUpCapture: finishKeyboardResize,
      onBlur: finishKeyboardResize,
    },
  };
}
