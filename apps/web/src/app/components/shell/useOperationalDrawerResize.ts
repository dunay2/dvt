/** Adapt transient separator gestures and measured group space to the existing layout command. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ImperativePanelHandle } from '../ui/resizable';
import {
  OPERATIONAL_DRAWER_HEIGHT,
  OPERATIONAL_DRAWER_PERCENT,
  resolveBottomDrawerDefaultSize,
} from './appShellPanelSizing';

export const OPERATIONAL_DRAWER_GROUP_ID = 'app-shell-vertical-panels';
const RESIZE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End']);

export function useOperationalDrawerResize(
  request: Readonly<{
    height: number;
    visible: boolean;
    onHeightChange: (height: number) => void;
  }>
) {
  const groupHostRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<ImperativePanelHandle | null>(null);
  const inputOrigin = useRef<'idle' | 'pointer' | 'keyboard'>('idle');
  const latestRequest = useRef(request);
  latestRequest.current = request;
  // This is a DOM measurement read model, never a second remembered drawer size.
  const [groupHeight, setGroupHeight] = useState(0);
  const readGroupHeight = useCallback((): number => {
    const height = groupHostRef.current
      ?.querySelector<HTMLElement>(`[data-panel-group-id="${OPERATIONAL_DRAWER_GROUP_ID}"]`)
      ?.getBoundingClientRect().height;
    return height != null && Number.isFinite(height) && height > 0 ? height : 0;
  }, []);

  useLayoutEffect(() => {
    const group = groupHostRef.current?.querySelector<HTMLElement>(
      `[data-panel-group-id="${OPERATIONAL_DRAWER_GROUP_ID}"]`
    );
    if (group == null) return;
    const measure = (): void => {
      setGroupHeight(readGroupHeight());
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => {
        window.removeEventListener('resize', measure);
        inputOrigin.current = 'idle';
      };
    }
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => {
      observer.disconnect();
      inputOrigin.current = 'idle';
    };
  }, [readGroupHeight]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!request.visible || panel == null || groupHeight <= 0 || inputOrigin.current !== 'idle')
      return;
    const target = resolveBottomDrawerDefaultSize(request.height, groupHeight);
    if (Math.abs(panel.getSize() - target) > 0.01) panel.resize(target);
  }, [request.height, request.visible, groupHeight]);

  const onResize = useCallback(
    (size: number): void => {
      const current = latestRequest.current;
      const measuredHeight = readGroupHeight();
      if (
        !current.visible ||
        inputOrigin.current === 'idle' ||
        measuredHeight <= 0 ||
        !Number.isFinite(size)
      )
        return;
      current.onHeightChange((size / 100) * measuredHeight);
    },
    [readGroupHeight]
  );
  const onDragging = useCallback((dragging: boolean): void => {
    inputOrigin.current = dragging ? 'pointer' : 'idle';
  }, []);
  const onKeyDownCapture = useCallback(
    (event: Readonly<Pick<KeyboardEvent, 'key' | 'defaultPrevented'>>): void => {
      if (!event.defaultPrevented && RESIZE_KEYS.has(event.key)) inputOrigin.current = 'keyboard';
    },
    []
  );
  const finishKeyboardResize = useCallback((): void => {
    inputOrigin.current = 'idle';
  }, []);

  return {
    groupHostRef,
    panelRef,
    onResize,
    onDragging,
    onKeyDownCapture,
    onKeyUpCapture: finishKeyboardResize,
    onBlur: finishKeyboardResize,
    defaultSize: resolveBottomDrawerDefaultSize(request.height, groupHeight),
    minSize:
      groupHeight <= 0
        ? OPERATIONAL_DRAWER_PERCENT.min
        : Math.min(
            OPERATIONAL_DRAWER_PERCENT.max,
            Math.max(
              OPERATIONAL_DRAWER_PERCENT.min,
              (OPERATIONAL_DRAWER_HEIGHT.min / groupHeight) * 100
            )
          ),
  };
}
