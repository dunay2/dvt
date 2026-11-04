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
import { projectCanvasExplorerSources } from './canvasExplorerItems';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerCategoryAction } from './canvasExplorerItems';

export function CanvasGraphExplorer({
  nodes,
  onSelect,
  onImport,
  onAddModel,
  catalogue,
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
  canPlaceSource?: boolean;
  referencePlacementScope?: string;
  importedSourceIds?: readonly string[];
  onImportFocusComplete?: () => void;
}>): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const rootRef = useRef<HTMLDivElement>(null);
  const sources = useMemo(() => projectCanvasExplorerSources(catalogue ?? []), [catalogue]);
  const models = useMemo(
    () =>
      (catalogue ?? []).filter(
        (node) => node.role === 'transform' && workspaceNodeDefinitionId(node) == null
      ),
    [catalogue]
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
  const items = [
    ...sources.map((source) => ({
      ...source,
      category: copy.sources,
      draggable: placeableIds.has(source.id),
      disabled: !placeableIds.has(source.id),
    })),
    ...models.map((node) => ({
      id: node.id,
      label: node.name,
      category: copy.models,
      draggable: placeableIds.has(node.id),
      disabled: !placeableIds.has(node.id),
      selected: nodes.some((placed) => placed.id === node.id && placed.selected),
    })),
  ];
  const categoryActions = new Map<string, CanvasExplorerCategoryAction>([
    [
      copy.sources,
      { label: copy.importSources, onAdd: onImport == null ? undefined : () => onImport() },
    ],
    [copy.models, { label: copy.addModel, onAdd: onAddModel }],
  ]);
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
      workspaceTask={workspaceTask}
      projectFiles={projectFiles}
      activityRail={activityRail}
      elements={
        projectFiles?.renderElements == null ? (
          <CanvasExplorerList
            items={items}
            categoryActions={categoryActions}
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
              categoryActions,
            })
        )
      }
    >
      {children}
    </CanvasExplorer>
  );
}
