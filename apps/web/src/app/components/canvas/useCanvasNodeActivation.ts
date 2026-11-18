/**
 * Owned concern: admit immediate inspection and native card entry.
 * @baseline ADR-0069: node gestures delegate existing inspection/open callbacks.
 * @decision Inspect the first click immediately and keep double-click entry explicit.
 * @consequence Controls, modifiers and consumed clicks cannot place or activate a node.
 * @version 1.0.0
 */
import type { MouseEvent, MouseEventHandler } from 'react';
import { isCanvasNodeEmbeddedControlTarget } from './canvasNodeInteractionBoundary';

function admitsActivation(event: MouseEvent<HTMLElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    !isCanvasNodeEmbeddedControlTarget(event.target)
  );
}

type CanvasNodeActivation = Readonly<{
  activation: 'open' | 'inspect' | undefined;
  onClick: MouseEventHandler<HTMLElement>;
  onDoubleClick: MouseEventHandler<HTMLElement>;
}>;

export function useCanvasNodeActivation(
  onSelectNode?: () => void,
  onOpenNode?: () => void
): CanvasNodeActivation {
  const onClick: MouseEventHandler<HTMLElement> = (event) => {
    if (admitsActivation(event) && event.detail <= 1) onSelectNode?.();
  };

  const onDoubleClick: MouseEventHandler<HTMLElement> = (event) => {
    if (admitsActivation(event)) onOpenNode?.();
  };

  return {
    activation: onOpenNode != null ? 'open' : onSelectNode != null ? 'inspect' : undefined,
    onClick,
    onDoubleClick,
  };
}
