/** Cross-card field transfer carries producer identity, not labels or mutable column state. */
import type { DragEvent } from 'react';
import type { GraphNodeColumn, GraphNodeColumnSectionProps } from './graphNodeColumnContracts';

const mime = 'application/x-dvt-canvas-field';

export function writeGraphColumnTransfer(
  event: DragEvent,
  nodeId: string,
  column: GraphNodeColumn
) {
  event.dataTransfer.setData(mime, JSON.stringify({ nodeId, columnId: column.id ?? column.name }));
  event.dataTransfer.effectAllowed = 'linkMove';
}

export function graphColumnTransferTarget(
  props: Pick<GraphNodeColumnSectionProps, 'nodeId' | 'onInputMapping'>
) {
  return {
    onDragOver(event: DragEvent) {
      if (props.onInputMapping == null || !event.dataTransfer.types.includes(mime)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'link';
    },
    onDrop(event: DragEvent) {
      if (props.nodeId == null || props.onInputMapping == null) return;
      const raw = event.dataTransfer.getData(mime);
      if (!raw) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        const identity: unknown = JSON.parse(raw);
        if (
          identity == null ||
          typeof identity !== 'object' ||
          !('nodeId' in identity) ||
          !('columnId' in identity) ||
          typeof identity.nodeId !== 'string' ||
          typeof identity.columnId !== 'string' ||
          !identity.nodeId ||
          !identity.columnId ||
          identity.nodeId === props.nodeId
        )
          return;
        props.onInputMapping({
          target: { nodeId: props.nodeId },
          source: { nodeId: identity.nodeId, columnId: identity.columnId },
        });
      } catch {
        // A foreign or malformed drag does not author a field.
      }
    },
  };
}
