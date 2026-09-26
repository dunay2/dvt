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

export function graphColumnTransferTarget(props: GraphNodeColumnSectionProps) {
  return {
    onDragOver(event: DragEvent) {
      if (props.onColumnOutputToggle == null || !event.dataTransfer.types.includes(mime)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'link';
    },
    onDrop(event: DragEvent) {
      if (props.nodeId == null || props.onColumnOutputToggle == null) return;
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
          identity.nodeId === props.nodeId
        )
          return;
        const matches =
          props.inputColumns?.filter(
            (column) =>
              column.source?.nodeId === identity.nodeId &&
              column.source?.columnId === identity.columnId
          ) ?? [];
        const column = matches.length === 1 ? matches[0] : undefined;
        if (column == null || column.outputToggleDisabled || column.output) return;
        props.onColumnOutputToggle({
          nodeId: props.nodeId,
          columnId: column.id ?? column.name,
          columnType: column.type,
          output: true,
          source: column.source,
        });
      } catch {
        // A foreign or malformed drag does not author a field.
      }
    },
  };
}
