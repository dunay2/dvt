/**
 * Owned concern: pass the current Explorer presentation intent to retained surfaces.
 * @baseline ADR-0069: presentation context delegates to the existing Model and Inspector owners.
 * @decision Share one project catalog slot without copying draft or query state.
 * @consequence Native input controls remain independently available in the Model workspace.
 * @version 1.0.0
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
  type DragEvent,
} from 'react';
import type { CanvasInspectorCommand } from '../../stores/canvasInspectorTarget';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';
import type { CanonicalNode } from '../../types/canonical';
import type { useCanvasModelBrowser } from './useCanvasModelBrowser';
import { CanvasProjectElementsExplorerView } from './explorer/CanvasProjectElementsExplorer';
import { useWorkspaceDbtProjectContext } from '../code/useWorkspaceDbtProjectContext';
import type { CanvasDbtModelPublication } from './canvasDbtModelCompositionDiscovery';
import { CanvasWarehouseConnections } from './explorer/CanvasWarehouseConnections';
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import { CanvasModelContextPicker } from './CanvasModelContextPicker';
import type { CanvasExplorerCatalogPresentation } from './explorer/CanvasExplorer.types';
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from './canvasNodeDropPayload';

export type CanvasModelBrowserPresentation = Readonly<{
  scopeKey: string | null;
  mode: CanvasModelView | null;
  onSelect: CanvasInspectorCommand;
  catalog: (
    composition?: Readonly<{
      nodeIds: ReadonlySet<string>;
      linkedNodeIds?: ReadonlySet<string>;
      occurrenceNodeIds?: ReadonlySet<string>;
    }>,
    modelInputs?: ReactNode
  ) => ReactNode;
  cataloguePresentation: CanvasExplorerCatalogPresentation;
  fileModels?: CanvasDbtModelPublication;
}>;
export const CanvasModelBrowser = createContext<CanvasModelBrowserPresentation | null>(null);
export function useCanvasModelBrowserPresentation(): CanvasModelBrowserPresentation | null {
  return useContext(CanvasModelBrowser);
}

function startCompositionDrag(
  composition: Parameters<CanvasModelBrowserPresentation['catalog']>[0],
  scopeKey: string | null,
  id: string,
  event: DragEvent<HTMLButtonElement>
): void {
  if (!composition?.nodeIds.has(id) || scopeKey == null) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE, JSON.stringify({ id, scopeKey }));
  event.dataTransfer.effectAllowed =
    composition.linkedNodeIds?.has(id) || composition.occurrenceNodeIds?.has(id) ? 'link' : 'copy';
}

export function CanvasModelBrowserProvider({
  navigation,
  nodes,
  canvasId,
  selectedId,
  active,
  projectRoot,
  onManageConnections,
  children,
}: Readonly<{
  navigation: ReturnType<typeof useCanvasModelBrowser>;
  nodes: readonly CanonicalNode[];
  canvasId: string | null;
  selectedId?: string;
  active: boolean;
  projectRoot?: string;
  onManageConnections?: () => void;
  children: ReactNode;
}>): JSX.Element {
  const { scopeKey, mode, onSelect, cataloguePresentation, catalogue } = navigation;
  const enabled = active && selectedId != null;
  const projectContext = useWorkspaceDbtProjectContext({
    enabled,
    projectRoot,
  });
  const items = useMemo(() => {
    const selected = nodes.find((node) => node.id === selectedId);
    const definitionId = workspaceNodeDefinitionId(selected) ?? selectedId;
    return catalogue.map((item) => ({
      ...item,
      selected: item.id === definitionId,
      draggable: false,
    }));
  }, [nodes, catalogue, selectedId]);
  const catalog = useCallback<CanvasModelBrowserPresentation['catalog']>(
    (composition, modelInputs) => (
      <CanvasProjectElementsExplorerView
        projectContext={projectContext}
        enabled={enabled}
        projectRoot={projectRoot}
        items={items.map((item) => ({
          ...item,
          draggable: composition?.nodeIds.has(item.id) === true,
        }))}
        hideAddModel
        canDragModel={(id) => composition?.nodeIds.has(id) === true}
        onDragStart={(id, event) => startCompositionDrag(composition, scopeKey, id, event)}
        presentation={cataloguePresentation}
        catalogueScopeKey={canvasId ?? undefined}
        onInspectNode={onSelect}
        connections={
          <>
            <CanvasWarehouseConnections onManage={onManageConnections} />
            {modelInputs}
          </>
        }
      />
    ),
    [
      projectContext,
      enabled,
      projectRoot,
      items,
      scopeKey,
      cataloguePresentation,
      canvasId,
      onSelect,
      onManageConnections,
    ]
  );
  const { projection, refresh } = projectContext;
  const value = useMemo(
    () => ({
      scopeKey,
      mode,
      onSelect,
      cataloguePresentation,
      catalog,
      fileModels: { projection, refresh },
    }),
    [scopeKey, mode, onSelect, cataloguePresentation, catalog, projection, refresh]
  );
  return (
    <CanvasModelBrowser.Provider value={value}>
      {children}
      <CanvasModelContextPicker
        contexts={navigation.contexts}
        onSelect={navigation.selectContext}
        onClose={navigation.cancelContext}
      />
    </CanvasModelBrowser.Provider>
  );
}
