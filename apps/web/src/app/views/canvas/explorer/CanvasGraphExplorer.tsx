/**
 * Owned concern: adapt the main Canvas graph to the shared explorer.
 * @baseline GH-3610: registered sources need not have a placed card.
 * @decision Inspect actual definitions on activation; transfer their identity only on drag.
 * @consequence Inspection cannot enter the guarded placement command.
 * @version 1.0.0
 */
import { useEffect, useMemo, useRef, type ReactNode, type DragEvent } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../../types/canonical';
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';
import { isPlaceableCanvasResource } from '../canvasResourcePlacements';
import { CanvasExplorer } from './CanvasExplorer';
import type {
  CanvasExplorerActivityRail,
  CanvasExplorerProjectWorkspace,
} from './CanvasExplorer.types';
import { CanvasExplorerList } from './CanvasExplorerList';
import { projectCanvasExplorerModels } from './canvasExplorerItems';
import { CanvasWarehouseConnections } from './CanvasWarehouseConnections';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type {
  CanvasInspectorCommand,
  CanvasInspectorResource,
} from '../../../stores/canvasInspectorTarget';

export function CanvasGraphExplorer({
  onInspectNode,
  inspectorTarget,
  catalogueScopeKey,
  onImport,
  onManageConnections,
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
  onInspectNode: CanvasInspectorCommand;
  inspectorTarget?: CanvasInspectorResource | null;
  catalogueScopeKey?: string;
  onImport?: () => void;
  onManageConnections?: () => void;
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
  const inspectedCanonicalNode =
    inspectorTarget?.kind === 'canonical-node'
      ? catalogue?.find((node) => node.id === inspectorTarget.nodeId)
      : undefined;
  const inspectedDefinitionId =
    inspectorTarget?.kind === 'canonical-node'
      ? inspectedCanonicalNode == null
        ? inspectorTarget.nodeId
        : (workspaceNodeDefinitionId(inspectedCanonicalNode) ?? inspectedCanonicalNode.id)
      : null;
  const items = definitions.map((item) => ({
    ...item,
    draggable: placeableIds.has(item.id),
    disabled: typeof onInspectNode !== 'function',
    selected:
      inspectorTarget?.kind === 'dbt-file-model'
        ? item.definitionIdentity?.canvasId === inspectorTarget.binding.canvasId &&
          item.definitionIdentity.uniqueId === inspectorTarget.uniqueId
        : item.id === inspectedDefinitionId,
  }));
  const connections = <CanvasWarehouseConnections onManage={onManageConnections} />;
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
            key={catalogueScopeKey}
            items={items}
            onAddModel={onAddModel}
            onImport={onImport}
            connections={connections}
            onSelect={(id) => onInspectNode({ kind: 'canonical-node', nodeId: id })}
            onDragStart={dragResource}
          />
        ) : (
          (enabled) =>
            projectFiles.renderElements?.({
              enabled,
              items,
              canCreateInstances: canPlaceSource && referencePlacementScope == null,
              onInspectNode,
              inspectorTarget,
              catalogueScopeKey,
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
