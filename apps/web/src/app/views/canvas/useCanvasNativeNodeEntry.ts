/**
 * Owned concern: retain native card entry when inspection covers the second target.
 * @baseline ADR-0069: one scoped adapter delegates to the existing Model-open owner.
 * @decision Admit a completed first click and native second-click detail without timers.
 * @consequence Cancelled, hidden, disconnected and stale Canvas origins cannot receive entry.
 * @version 1.0.0
 */
import { useRef, type HTMLAttributes, type MouseEvent } from 'react';
import {
  isCanvasElement,
  isCanvasNodeEmbeddedControlTarget,
} from '../../components/canvas/canvasNodeInteractionBoundary';

export type CanvasNativeNodeEntryCapture = Pick<
  HTMLAttributes<HTMLDivElement>,
  | 'onMouseDownCapture'
  | 'onClickCapture'
  | 'onClick'
  | 'onDoubleClickCapture'
  | 'onKeyDownCapture'
  | 'onContextMenuCapture'
  | 'onDragStartCapture'
>;
type Origin = {
  canvasId: string;
  shell: Element;
  nodeId: string;
  open: boolean;
  clicked: boolean;
  covered: boolean;
};

export function useCanvasNativeNodeEntry(
  canvasId: string | null,
  openModel?: (nodeId: string) => void
): CanvasNativeNodeEntryCapture {
  const origin = useRef<Origin | null>(null);
  const clear = (): void => {
    origin.current = null;
  };
  const covered = (event: MouseEvent<HTMLDivElement>): Origin | null => {
    const first = origin.current;
    return first != null &&
      first.clicked &&
      first.canvasId === canvasId &&
      first.shell.isConnected &&
      event.currentTarget.contains(first.shell) &&
      first.shell.closest('[hidden], [inert], [aria-hidden="true"]') == null &&
      isCanvasElement(event.target) &&
      event.target.closest('[data-slot="canvas-node-workbench-overlay"]') != null
      ? first
      : null;
  };
  const suppress = (event: MouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };
  return {
    onMouseDownCapture: (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        clear();
        return;
      }
      if (event.detail === 1) {
        clear();
        if (
          canvasId == null ||
          !isCanvasElement(event.target) ||
          isCanvasNodeEmbeddedControlTarget(event.target)
        )
          return;
        const shell = event.target.closest('[data-slot="canvas-node-shell"]');
        const nodeId = shell?.closest('.react-flow__node')?.getAttribute('data-id');
        const capability = shell?.getAttribute('data-canvas-node-activation');
        if (shell != null && nodeId && (capability === 'open' || capability === 'inspect'))
          origin.current = {
            canvasId,
            shell,
            nodeId,
            open: capability === 'open',
            clicked: false,
            covered: false,
          };
      } else if (event.detail === 2) {
        const first = covered(event);
        if (first == null) {
          clear();
          return;
        }
        first.covered = true;
        suppress(event);
      } else clear();
    },
    onClickCapture: (event) => {
      if (event.defaultPrevented) {
        clear();
        return;
      }
      if (event.detail === 2 && covered(event)?.covered) suppress(event);
    },
    onClick: (event) => {
      const first = origin.current;
      if (
        event.detail === 1 &&
        !event.defaultPrevented &&
        first?.canvasId === canvasId &&
        isCanvasElement(event.target) &&
        first.shell.contains(event.target)
      )
        first.clicked = true;
    },
    onDoubleClickCapture: (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        clear();
        return;
      }
      const first = covered(event);
      clear();
      if (event.detail !== 2 || first?.covered !== true) return;
      suppress(event);
      if (first.open) openModel?.(first.nodeId);
    },
    onKeyDownCapture: clear,
    onContextMenuCapture: clear,
    onDragStartCapture: clear,
  };
}
