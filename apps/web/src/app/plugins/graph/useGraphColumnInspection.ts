/** Own read-only row gestures; output mutation remains on the explicit checkbox. */
import type { HTMLAttributes, RefObject } from 'react';
import type { GraphNodeColumn, GraphNodeColumnInspect } from './graphNodeColumnContracts';
import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';

export function useGraphColumnInspection(
  column: GraphNodeColumn,
  nodeId: string | undefined,
  inspect: GraphNodeColumnInspect | undefined,
  ref: RefObject<HTMLDivElement>
): HTMLAttributes<HTMLDivElement> {
  if (inspect == null || nodeId == null) return {};
  const canInspect = column.output !== false && column.id != null;
  const open = () => {
    if (canInspect && ref.current != null)
      inspect({ nodeId, fieldId: column.id!, anchorElement: ref.current });
  };
  return {
    ...canvasNodeEmbeddedControlProps,
    'aria-keyshortcuts': canInspect ? 'Enter' : undefined,
    onClick(event) {
      event.stopPropagation();
      event.currentTarget.focus({ preventScroll: true });
      if (event.detail < 2) open();
    },
    onDoubleClick(event) {
      event.stopPropagation();
    },
    onKeyDown(event) {
      if (
        event.target !== event.currentTarget ||
        event.key !== 'Enter' ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.metaKey
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      open();
    },
  };
}
