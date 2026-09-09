/** Owned concern: provide one pointer and keyboard reorder gesture for Inspector lists. */
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

type DropTarget = Readonly<{
  id: string;
  placement: 'before' | 'after';
}>;

export function useInspectorListReorder(args: {
  orderedIds: readonly string[];
  visibleIds: readonly string[];
  enabled: boolean;
  onMove: (movedId: string, targetId: string, placement: 'before' | 'after') => void;
  onMoved?: (movedId: string) => void;
}) {
  const draggedIdRef = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  return {
    canReorder: args.enabled,
    dropPlacement(id: string): DropTarget['placement'] | undefined {
      return dropTarget?.id === id ? dropTarget.placement : undefined;
    },
    startDrag(id: string, event: DragEvent<HTMLElement>): void {
      if (!args.enabled) return;
      event.stopPropagation();
      draggedIdRef.current = id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    },
    endDrag(): void {
      draggedIdRef.current = null;
      setDropTarget(null);
    },
    dragOver(id: string, event: DragEvent<HTMLElement>): void {
      const draggedId = draggedIdRef.current;
      if (!args.enabled || draggedId == null || draggedId === id) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      const placement = event.clientY - bounds.top < bounds.height / 2 ? 'before' : 'after';
      event.dataTransfer.dropEffect = 'move';
      setDropTarget({ id, placement });
    },
    dragLeave(event: DragEvent<HTMLElement>): void {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
    },
    drop(id: string, event: DragEvent<HTMLElement>): void {
      const draggedId = draggedIdRef.current;
      const placement = dropTarget?.id === id ? dropTarget.placement : null;
      if (!args.enabled || draggedId == null || draggedId === id || placement == null) return;
      event.preventDefault();
      event.stopPropagation();
      args.onMove(draggedId, id, placement);
      args.onMoved?.(draggedId);
      draggedIdRef.current = null;
      setDropTarget(null);
    },
    moveWithKeyboard(id: string, event: KeyboardEvent<HTMLElement>): boolean {
      if (
        !args.enabled ||
        !event.altKey ||
        (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
      ) {
        return false;
      }
      const currentIndex = args.visibleIds.indexOf(id);
      const targetId = args.visibleIds[currentIndex + (event.key === 'ArrowUp' ? -1 : 1)];
      if (targetId != null) {
        event.preventDefault();
        event.stopPropagation();
        args.onMove(id, targetId, event.key === 'ArrowUp' ? 'before' : 'after');
        args.onMoved?.(id);
      }
      return true;
    },
  };
}
