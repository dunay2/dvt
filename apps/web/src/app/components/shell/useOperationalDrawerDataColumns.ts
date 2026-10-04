/**
 * Owned concern: move displayed sample columns by pointer or keyboard.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Retain presentation order only; canonical field order is never written.
 * @consequence Reordering applies equally to header and corresponding values.
 * @version 1.0.0
 */
import { useRef, useState, type ButtonHTMLAttributes, type DragEvent } from 'react';

const dragType = 'text/x-dvt-data-column';
type Edge = 'before' | 'after';
const dropEdge = (event: DragEvent<HTMLButtonElement>): Edge => {
  const bounds = event.currentTarget.getBoundingClientRect();
  return bounds.width === 0 || event.clientX <= bounds.left + bounds.width / 2 ? 'before' : 'after';
};

export function useOperationalDrawerDataColumns(columns: readonly { name: string }[]) {
  const [preferredOrder, setOrder] = useState<readonly string[]>([]);
  const [target, setTarget] = useState<{ id: string; edge: Edge } | null>(null);
  const dragged = useRef<string | null>(null);
  const names = columns.map((column) => column.name);
  const order = [
    ...preferredOrder.filter((id) => names.includes(id)),
    ...names.filter((id) => !preferredOrder.includes(id)),
  ];
  const move = (source: string, destination: string, edge: Edge) => {
    if (source === destination || !order.includes(source) || !order.includes(destination)) return;
    const next = order.filter((id) => id !== source);
    next.splice(next.indexOf(destination) + (edge === 'after' ? 1 : 0), 0, source);
    setOrder(next);
  };
  const end = () => {
    dragged.current = null;
    setTarget(null);
  };
  const bind = (id: string): { edge?: Edge; events: ButtonHTMLAttributes<HTMLButtonElement> } => ({
    edge: target?.id === id ? target.edge : undefined,
    events: {
      draggable: true,
      onDragStart: (event) => {
        dragged.current = id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(dragType, id);
      },
      onDragOver: (event) => {
        if (dragged.current == null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setTarget({ id, edge: dropEdge(event) });
      },
      onDragEnd: end,
      onDrop: (event) => {
        event.preventDefault();
        move(event.dataTransfer.getData(dragType), id, dropEdge(event));
        end();
      },
      onKeyDown: (event) => {
        if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const left = event.key === 'ArrowLeft';
        const destination = order[order.indexOf(id) + (left ? -1 : 1)];
        if (destination != null) move(id, destination, left ? 'before' : 'after');
      },
    },
  });
  return { order, bind };
}
