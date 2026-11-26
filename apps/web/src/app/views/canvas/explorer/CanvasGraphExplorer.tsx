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
  CanvasProjectElementsInput,
  CanvasExplorerActivityRail,
  CanvasExplorerProjectWorkspace,
} from './CanvasExplorer.types';
import { CanvasExplorerList } from './CanvasExplorerList';
import { CanvasExplorerCatalogPanel } from './CanvasExplorerDocuments';
import { projectCanvasExplorerModels } from './canvasExplorerItems';
import { CanvasWarehouseConnections } from './CanvasWarehouseConnections';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import { useCanvasModelBrowserPresentation } from '../CanvasModelBrowser';
import type {
  CanvasInspectorCommand,
  CanvasInspectorResource,
} from '../../../stores/canvasInspectorTarget';

type CanvasGraphExplorerProps = Readonly<{
  onInspectNode: CanvasInspectorCommand;
  inspectorTarget?: CanvasInspectorResource | null;
  catalogueScopeKey?: string;
  onImport?: () => void;
  onManageConnections?: () => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  onRemoveEmptyModel?: (id: string) => void;
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
}>;

export function CanvasGraphExplorer({
  onInspectNode,
  inspectorTarget,
  catalogueScopeKey,
  onImport,
  onManageConnections,
  onAddModel,
  onRemoveEmptyModel,
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
}: CanvasGraphExplorerProps): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const browser = useCanvasModelBrowserPresentation();
  const inspect = browser?.mode == null ? onInspectNode : browser.onSelect;
  const cataloguePresentation = browser?.cataloguePresentation;
  const rootRef = useRef<HTMLDivElement>(null);
  const definitions = useMemo(
    function projectExplorerDefinitions() {
      return projectCanvasExplorerModels(catalogue ?? [], sourceCatalogueCanvasId);
    },
    [catalogue, sourceCatalogueCanvasId]
  );
  const placeableIds = useMemo(
    function projectExplorerPlacementAdmission() {
      return projectCanvasExplorerPlaceableIds(catalogue, referencePlacementScope, canPlaceSource);
    },
    [catalogue, canPlaceSource, referencePlacementScope]
  );
  const inspectedDefinitionId = resolveInspectedDefinitionId(inspectorTarget, catalogue);
  const items = projectGraphExplorerItems(definitions, {
    placeableIds,
    onInspectNode,
    inspectorTarget,
    inspectedDefinitionId,
  });
  const connections = <CanvasWarehouseConnections onManage={onManageConnections} />;
  const draggableIds = new Set(items.filter((item) => item.draggable).map((item) => item.id));
  const dragResource = createGraphExplorerDragHandler(draggableIds, referencePlacementScope);
  useEffect(
    function revealImportedSource() {
      if (importedSourceIds.length === 0) return;
      const registered = catalogue?.some((node) => importedSourceIds.includes(node.id));
      if (!registered) return;
      revealCanvasImportedSource(rootRef.current, importedSourceIds[0], onImportFocusComplete);
    },
    [catalogue, importedSourceIds, onImportFocusComplete]
  );
  return (
    <CanvasExplorer
      rootRef={rootRef}
      heading={{ label: copy.explorerTitle, contextLabel: copy.project }}
      workspaceTask={workspaceTask}
      projectFiles={projectFiles}
      activityRail={activityRail}
      elements={buildCanvasGraphExplorerElements({
        projectFiles,
        copy,
        items,
        presentation: cataloguePresentation,
        onAddModel,
        onRemoveEmptyModel,
        onImport,
        connections,
        onInspectNode: inspect,
        onDragStart: dragResource,
        canCreateInstances: canPlaceSource && referencePlacementScope == null,
        inspectorTarget,
        catalogueScopeKey,
      })}
    >
      {children}
    </CanvasExplorer>
  );
}

function projectCanvasExplorerPlaceableIds(
  catalogue: readonly CanonicalNode[] | undefined,
  referencePlacementScope: string | undefined,
  canPlaceSource: boolean
): ReadonlySet<string> {
  const nodes = catalogue ?? [];
  if (referencePlacementScope != null)
    return new Set(nodes.filter(isPlaceableCanvasResource).map((node) => node.id));
  if (!canPlaceSource) return new Set();
  return new Set(
    nodes
      .filter(
        (node) =>
          workspaceNodeDefinitionId(node) == null &&
          node.metadata?.authority !== 'dbt-project-files' &&
          (node.role === 'input' || node.kind === 'dvt:transform')
      )
      .map((node) => node.id)
  );
}

function resolveInspectedDefinitionId(
  inspectorTarget: CanvasInspectorResource | null | undefined,
  catalogue: readonly CanonicalNode[] | undefined
): string | null {
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

  return inspectedDefinitionId;
}

function projectGraphExplorerItems(
  definitions: ReturnType<typeof projectCanvasExplorerModels>,
  {
    placeableIds,
    onInspectNode,
    inspectorTarget,
    inspectedDefinitionId,
  }: Pick<CanvasGraphExplorerProps, 'onInspectNode' | 'inspectorTarget'> &
    Readonly<{ placeableIds: ReadonlySet<string>; inspectedDefinitionId: string | null }>
) {
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

  return items;
}

function createGraphExplorerDragHandler(
  draggableIds: ReadonlySet<string>,
  referencePlacementScope: string | undefined
) {
  return draggableIds.size > 0
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
}

function buildCanvasGraphExplorerElements({
  projectFiles,
  copy,
  ...input
}: Pick<CanvasGraphExplorerProps, 'projectFiles'> &
  Readonly<{ copy: ReturnType<typeof resolveCanvasExplorerCopy> }> &
  Omit<CanvasProjectElementsInput, 'enabled'>) {
  if (projectFiles?.renderElements != null)
    return (enabled: boolean) => projectFiles.renderElements?.({ enabled, ...input });
  return (
    <CanvasExplorerCatalogPanel key={input.catalogueScopeKey} copy={copy}>
      <CanvasExplorerList
        items={input.items}
        presentation={input.presentation}
        onAddModel={input.onAddModel}
        onRemoveEmptyModel={input.onRemoveEmptyModel}
        onImport={input.onImport}
        connections={input.connections}
        onSelect={(id) => input.onInspectNode({ kind: 'canonical-node', nodeId: id })}
        onDragStart={input.onDragStart}
      />
    </CanvasExplorerCatalogPanel>
  );
}

function revealCanvasImportedSource(
  root: HTMLDivElement | null,
  firstImportedId: string | undefined,
  onComplete: (() => void) | undefined
): void {
  const first = Array.from(root?.querySelectorAll<HTMLElement>('[data-element-id]') ?? []).find(
    (element) => element.dataset.elementId === firstImportedId
  );
  first?.scrollIntoView?.({ block: 'nearest' });
  onComplete?.();
}
