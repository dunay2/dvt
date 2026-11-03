/**
 * Owned concern: adapt the main Canvas graph to the shared explorer.
 * @baseline GH-3610: registered sources need not have a placed card.
 * @decision Inspect source definitions on click; transfer only their identity on drag.
 * @consequence The existing guarded drop command alone admits sources to the graph.
 * @version 1.0.0
 */
import type { Node } from '@xyflow/react';
import { useEffect, useMemo, useRef, type ReactNode, type DragEvent } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../../types/canonical';
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';
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
  onInspectSource,
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
  onSelect: (id: string) => void;
  onImport?: () => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  children: ReactNode;
  workspaceTask?: ReactNode;
  projectFiles?: CanvasExplorerProjectWorkspace;
  activityRail?: CanvasExplorerActivityRail;
  catalogue?: readonly CanonicalNode[];
  onInspectSource?: (id: string) => void;
  canPlaceSource?: boolean;
  referencePlacementScope?: string;
  importedSourceIds?: readonly string[];
  onImportFocusComplete?: () => void;
}>): JSX.Element {
  const canPlaceModel = referencePlacementScope != null;
  const canPlaceInput = canPlaceSource || canPlaceModel;
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const rootRef = useRef<HTMLDivElement>(null);
  const sources = useMemo(() => projectCanvasExplorerSources(catalogue ?? []), [catalogue]);
  const models = useMemo(
    () => (catalogue ?? []).filter((node) => node.role === 'transform'),
    [catalogue]
  );
  const sourceIds = new Set(sources.map((source) => source.id));
  const modelIds = new Set(models.map((node) => node.id));
  const items = [
    ...sources.map((source) => ({
      ...source,
      category: copy.sources,
      draggable: canPlaceInput,
      disabled: onInspectSource == null,
    })),
    ...models.map((node) => ({
      id: node.id,
      label: node.name,
      category: copy.models,
      draggable: canPlaceModel,
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
  const dragResource = canPlaceInput
    ? (id: string, event: DragEvent<HTMLButtonElement>) => {
        if (!(canPlaceInput && sourceIds.has(id)) && !(canPlaceModel && modelIds.has(id))) {
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
  const inspect = (id: string) => (sourceIds.has(id) ? onInspectSource?.(id) : onSelect(id));
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
            onSelect={inspect}
            onDragStart={dragResource}
          />
        ) : (
          (enabled) =>
            projectFiles.renderElements?.({
              enabled,
              items,
              onSelect: inspect,
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
