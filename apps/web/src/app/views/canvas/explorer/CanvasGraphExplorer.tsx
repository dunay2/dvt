/**
 * Owned concern: adapt the main Canvas graph to the shared explorer.
 * @baseline GH-3610: registered sources need not have a placed card.
 * @decision Activate admitted definitions to create; transfer the same identity on drag.
 * @consequence Catalogue affordances reuse the guarded drop adapter's admission rule.
 * @version 1.0.0
 */
import type { Node } from '@xyflow/react';
import { useEffect, useMemo, useRef, type ReactNode, type DragEvent } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../../types/canonical';
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';
import { isPlaceableCanvasResource } from '../canvasResourcePlacements';
import { CanvasExplorer, type CanvasExplorerProjectWorkspace } from './CanvasExplorer';
import type { CanvasExplorerActivityRail } from './CanvasExplorer.templates';
import { CanvasExplorerList } from './CanvasExplorerList';
import { projectCanvasExplorerModels } from './canvasExplorerItems';
import { CanvasWarehouseConnections } from './CanvasWarehouseConnections';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';

export function CanvasGraphExplorer({
  nodes,
  onSelect,
  onImport,
  onAddModel,
  catalogue,
  sourceCatalogueCanvasId,
  canPlaceSource = false,
  referencePlacementScope,
  importedSourceIds = [],
  onImportFocusComplete,
  children,
  workspaceTask,
  projectFiles,
  activityRail,
}: Readonly<{
  nodes: readonly Node[];
  onSelect: (id: string, definition?: CanonicalNode) => void;
  onImport?: () => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  children: ReactNode;
  workspaceTask?: ReactNode;
  projectFiles?: CanvasExplorerProjectWorkspace;
  activityRail?: CanvasExplorerActivityRail;
  catalogue?: readonly CanonicalNode[];
  sourceCatalogueCanvasId?: string;
  canPlaceSource?: boolean;
  referencePlacementScope?: string;
  importedSourceIds?: readonly string[];
  onImportFocusComplete?: () => void;
}>): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const rootRef = useRef<HTMLDivElement>(null);
  const definitions = useMemo(
    () => projectCanvasExplorerModels(catalogue ?? [], sourceCatalogueCanvasId),
    [catalogue, sourceCatalogueCanvasId]
  );
  const placeableIds = useMemo(
    () =>
      new Set(
        (catalogue ?? [])
          .filter((node) =>
            referencePlacementScope != null
              ? isPlaceableCanvasResource(node)
              : canPlaceSource &&
                workspaceNodeDefinitionId(node) == null &&
                node.metadata?.authority !== 'dbt-project-files' &&
                (node.role === 'input' || node.kind === 'dvt:transform')
          )
          .map((node) => node.id)
      ),
    [catalogue, canPlaceSource, referencePlacementScope]
  );
  const items = definitions.map((item) => ({
    ...item,
    draggable: placeableIds.has(item.id),
    disabled: !placeableIds.has(item.id),
    selected: nodes.some((placed) => placed.id === item.id && placed.selected),
  }));
  const connections = <CanvasWarehouseConnections onManage={onImport} />;
  const draggableIds = new Set(items.filter((item) => item.draggable).map((item) => item.id));
  const dragResource =
    draggableIds.size > 0
      ? (id: string, event: DragEvent<HTMLButtonElement>) => {
          if (!draggableIds.has(id)) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.setData(
            CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
            JSON.stringify({ id, scopeKey: referencePlacementScope })
          );
          event.dataTransfer.effectAllowed = 'copy';
        }
      : undefined;
  useEffect(() => {
    if (importedSourceIds.length === 0) return;
    const registered = catalogue?.some((node) => importedSourceIds.includes(node.id));
    if (!registered) return;
    const first = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[data-element-id]') ?? []
    ).find((element) => element.dataset.elementId === importedSourceIds[0]);
    first?.scrollIntoView?.({ block: 'nearest' });
    onImportFocusComplete?.();
  }, [catalogue, importedSourceIds, onImportFocusComplete]);
  return (
    <CanvasExplorer
      rootRef={rootRef}
      heading={{ label: copy.explorerTitle, contextLabel: copy.project }}
      workspaceTask={workspaceTask}
      projectFiles={projectFiles}
      activityRail={activityRail}
      elements={
        projectFiles?.renderElements == null ? (
          <CanvasExplorerList
            items={items}
            onAddModel={onAddModel}
            onImport={onImport}
            connections={connections}
            onSelect={onSelect}
            onDragStart={dragResource}
          />
        ) : (
          (enabled) =>
            projectFiles.renderElements?.({
              enabled,
              items,
              canCreateInstances: canPlaceSource && referencePlacementScope == null,
              onSelect,
              onDragStart: dragResource,
              onAddModel,
              onImport,
              connections,
            })
        )
      }
    >
      {children}
    </CanvasExplorer>
  );
}
