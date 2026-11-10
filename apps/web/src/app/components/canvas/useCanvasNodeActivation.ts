/** Owned concern: arbitrate one Canvas node gesture and cancel superseded inspection intent. */
import { useCallback, useEffect, useRef, type MouseEventHandler } from 'react';
import { isCanvasNodeEmbeddedControlTarget } from './canvasNodeInteractionBoundary';

const SINGLE_CLICK_DELAY_MS = 500;

type CanvasNodeActivation = Readonly<{
  activation: 'open' | 'inspect' | undefined;
  onClick: MouseEventHandler<HTMLElement>;
  onDoubleClick: MouseEventHandler<HTMLElement>;
  cancelPendingClick: () => void;
}>;

export function useCanvasNodeActivation(
  nodeId: string,
  onSelectNode?: () => void,
  onOpenNode?: () => void
): CanvasNodeActivation {
  const pendingClick = useRef<{
    timer: ReturnType<typeof setTimeout>;
    ownerDocument: Document;
  } | null>(null);
  const selectNode = useRef(onSelectNode);
  selectNode.current = onSelectNode;
  const cancelPendingClick = useCallback((): void => {
    const pending = pendingClick.current;
    if (pending == null) return;
    clearTimeout(pending.timer);
    pending.ownerDocument.removeEventListener('pointerdown', cancelPendingClick, true);
    pending.ownerDocument.removeEventListener('keydown', cancelPendingClick, true);
    pendingClick.current = null;
  }, []);
  useEffect(() => cancelPendingClick, [cancelPendingClick, nodeId]);

  const onClick: MouseEventHandler<HTMLElement> = (event) => {
    cancelPendingClick();
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.detail > 1 ||
      isCanvasNodeEmbeddedControlTarget(event.target)
    ) {
      return;
    }
    if (event.detail === 0) {
      selectNode.current?.();
      return;
    }
    if (onSelectNode == null) return;
    const ownerDocument = event.currentTarget.ownerDocument;
    pendingClick.current = {
      ownerDocument,
      timer: setTimeout(() => {
        cancelPendingClick();
        selectNode.current?.();
      }, SINGLE_CLICK_DELAY_MS),
    };
    ownerDocument.addEventListener('pointerdown', cancelPendingClick, {
      capture: true,
      once: true,
    });
    ownerDocument.addEventListener('keydown', cancelPendingClick, { capture: true, once: true });
  };

  const onDoubleClick: MouseEventHandler<HTMLElement> = (event) => {
    cancelPendingClick();
    if (!isCanvasNodeEmbeddedControlTarget(event.target)) onOpenNode?.();
  };

  return {
    activation: onOpenNode != null ? 'open' : onSelectNode != null ? 'inspect' : undefined,
    onClick,
    onDoubleClick,
    cancelPendingClick,
  };
}
