/** Owned concern: render and reorder nested field members inside one structured column piece. */
import { useState, type DragEvent, type ReactElement } from 'react';

import type { GraphNodeColumn, GraphNodeColumnReorderIdentity } from './graphNodeColumnContracts';

export function GraphNodeColumnChildren(props: {
  nodeId?: string;
  parentColumnId?: string;
  children: readonly GraphNodeColumn[];
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
}): ReactElement {
  const [dropTarget, setDropTarget] = useState<Readonly<{
    fieldId: string;
    placement: 'before' | 'after';
  }> | null>(null);
  const canReorder =
    props.nodeId != null && props.parentColumnId != null && props.onColumnReorder != null;
  const reorder = (fieldId: string, targetFieldId: string, placement: 'before' | 'after') => {
    if (!canReorder || fieldId === targetFieldId) return;
    props.onColumnReorder?.({
      nodeId: props.nodeId!,
      parentColumnId: props.parentColumnId!,
      columnId: fieldId,
      targetColumnId: targetFieldId,
      placement,
    });
  };
  return (
    <div
      data-slot="graph-node-column-children"
      className="ml-2 basis-full space-y-1 border-l border-blue-500/40 pl-2"
    >
      {props.children.map((child, index) => (
        <div
          key={child.id ?? child.name}
          data-slot="graph-node-nested-column"
          data-field-id={child.id}
          data-parent-field-id={props.parentColumnId}
          data-drop-placement={
            dropTarget != null && dropTarget.fieldId === child.id ? dropTarget.placement : undefined
          }
          draggable={canReorder && child.id != null}
          tabIndex={canReorder ? 0 : undefined}
          className="relative flex min-w-0 items-center gap-2 rounded px-1 text-[11px] data-[drop-placement=after]:border-b-2 data-[drop-placement=before]:border-t-2 data-[drop-placement]:border-blue-400"
          onDragStart={(event) => {
            if (child.id == null) return;
            event.stopPropagation();
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('application/x-dvt-nested-field', child.id);
          }}
          onDragOver={(event) => {
            if (!canReorder || child.id == null) return;
            const fieldId = event.dataTransfer.getData('application/x-dvt-nested-field');
            if (fieldId.length === 0 || fieldId === child.id) return;
            event.preventDefault();
            event.stopPropagation();
            const bounds = event.currentTarget.getBoundingClientRect();
            setDropTarget({
              fieldId: child.id,
              placement: event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after',
            });
          }}
          onDrop={(event: DragEvent<HTMLDivElement>) => {
            if (child.id == null || dropTarget?.fieldId !== child.id) return;
            event.preventDefault();
            event.stopPropagation();
            reorder(
              event.dataTransfer.getData('application/x-dvt-nested-field'),
              child.id,
              dropTarget.placement
            );
            setDropTarget(null);
          }}
          onKeyDown={(event) => {
            if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
            const target = props.children[index + (event.key === 'ArrowUp' ? -1 : 1)];
            if (child.id == null || target?.id == null) return;
            event.preventDefault();
            event.stopPropagation();
            reorder(child.id, target.id, event.key === 'ArrowUp' ? 'before' : 'after');
          }}
        >
          <span className="truncate font-mono text-slate-200">{child.name}</span>
          <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
            {child.type}
          </span>
          {child.children == null ? null : (
            <GraphNodeColumnChildren
              nodeId={props.nodeId}
              parentColumnId={child.id}
              children={child.children}
              onColumnReorder={props.onColumnReorder}
            />
          )}
        </div>
      ))}
    </div>
  );
}
