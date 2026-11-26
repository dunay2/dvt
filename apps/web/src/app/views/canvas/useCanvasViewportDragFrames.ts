/** Render pointer coordinates at the viewport and forward settled edits to the graph owner. */
import type { Node, NodeChange, XYPosition } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type DragFrame = ReadonlyMap<string, XYPosition>;
const EMPTY_FRAME: DragFrame = new Map();

function updateFrame(previous: DragFrame, changes: readonly NodeChange[]): DragFrame {
  const next = new Map(previous);
  for (const change of changes) {
    switch (change.type) {
      case 'position':
        if (!change.dragging) next.delete(change.id);
        else if (change.position) next.set(change.id, change.position);
        break;
      case 'remove':
      case 'replace':
        next.delete(change.id);
        break;
    }
  }
  return next.size ? next : EMPTY_FRAME;
}

function retainVisibleFrames(frame: DragFrame, nodes: readonly Node[]): DragFrame {
  if (frame.size === 0) return frame;
  const visible = new Set(nodes.map((node) => node.id));
  const retained = [...frame].filter(([id]) => visible.has(id));
  return retained.length === frame.size ? frame : new Map(retained);
}

export function useCanvasViewportDragFrames(
  nodes: Node[],
  publish: (changes: NodeChange[]) => void
) {
  const [frame, setFrame] = useState<DragFrame>(EMPTY_FRAME);
  useEffect(() => {
    setFrame((current) => retainVisibleFrames(current, nodes));
  }, [nodes]);

  const renderedNodes = useMemo(() => {
    if (frame.size === 0) return nodes;
    return nodes.map((node) => {
      const position = frame.get(node.id);
      return position ? { ...node, position, dragging: true } : node;
    });
  }, [frame, nodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updates = changes.filter(
        (change) => change.type !== 'position' || change.dragging !== true
      );
      setFrame((previous) => updateFrame(previous, changes));
      if (updates.length) publish(updates);
    },
    [publish]
  );
  return { nodes: renderedNodes, onNodesChange };
}
