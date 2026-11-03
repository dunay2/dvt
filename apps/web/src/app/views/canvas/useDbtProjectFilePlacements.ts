/** Owned concern: admit and resolve visual resource references through the existing Canvas layout rail. */
import { useCallback, useMemo, type DragEventHandler } from 'react';
import { useReactFlow, type NodeChange } from '@xyflow/react';
import { randomUuidV4 } from '@dvt/crypto';
import {
  useCanvasInteractionStore,
  type CanvasResourceInstance,
} from '../../stores/canvasInteractionStore';
import type { CanonicalNode } from '../../types/canonical';
import {
  CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
  CANVAS_NODE_DROP_GRAPH_ANCHOR,
  readCanvasCatalogNodeDragReference,
} from './canvasNodeDropPayload';
import {
  isPlaceableCanvasResource,
  projectCanvasResourcePlacements,
} from './canvasResourcePlacements';

const EMPTY_INSTANCES: readonly CanvasResourceInstance[] = [];

export function useDbtProjectFilePlacements({
  layoutKey,
  resources,
  canPlaceReferences,
}: Readonly<{
  layoutKey: string;
  resources: readonly CanonicalNode[];
  canPlaceReferences: boolean;
}>) {
  const instances = useCanvasInteractionStore(
    (state) => state.canvasLayouts[layoutKey]?.resourceInstances ?? EMPTY_INSTANCES
  );
  const place = useCanvasInteractionStore((state) => state.placeCanvasResourceInstance);
  const remove = useCanvasInteractionStore((state) => state.removeCanvasResourceInstance);
  const { screenToFlowPosition } = useReactFlow();
  const resourcesById = useMemo(
    () => new Map(resources.map((node) => [node.id, node])),
    [resources]
  );
  const projection = useMemo(
    () => projectCanvasResourcePlacements(resources, instances),
    [resources, instances]
  );
  const removeInstance = useCallback(
    (id: string) => {
      if (projection.definitionIdByInstanceId.has(id)) remove(layoutKey, id);
    },
    [layoutKey, projection.definitionIdByInstanceId, remove]
  );
  const applyNodeChanges = useCallback(
    (changes: NodeChange[]): NodeChange[] => {
      const retained = changes.filter((change) => {
        if (change.type !== 'remove') return true;
        removeInstance(change.id);
        return false;
      });
      return retained;
    },
    [removeInstance]
  );
  const onDragOver = useCallback<DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect =
        canPlaceReferences && event.dataTransfer.types.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)
          ? 'copy'
          : 'none';
    },
    [canPlaceReferences]
  );
  const onDrop = useCallback<DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'none';
      if (
        !canPlaceReferences ||
        !event.dataTransfer.types.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)
      )
        return;
      const reference = readCanvasCatalogNodeDragReference(event.dataTransfer);
      if (reference?.scopeKey !== layoutKey) return;
      const resource = resourcesById.get(reference.id);
      if (resource == null || !isPlaceableCanvasResource(resource)) return;
      const position = screenToFlowPosition(
        { x: event.clientX, y: event.clientY },
        { snapToGrid: false }
      );
      place(
        layoutKey,
        { id: randomUuidV4(), resourceId: resource.id },
        {
          x: position.x - CANVAS_NODE_DROP_GRAPH_ANCHOR.x,
          y: position.y - CANVAS_NODE_DROP_GRAPH_ANCHOR.y,
        }
      );
      event.dataTransfer.dropEffect = 'copy';
    },
    [canPlaceReferences, layoutKey, place, resourcesById, screenToFlowPosition]
  );
  return { ...projection, removeInstance, applyNodeChanges, onDragOver, onDrop };
}
