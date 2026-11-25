/**
 * Owned concern: pass the current Explorer presentation intent to retained surfaces.
 * @baseline ADR-0069: presentation context delegates to the existing Model and Inspector owners.
 * @decision Share one project catalog slot without copying draft or query state.
 * @consequence Native input controls remain independently available in the Model workspace.
 * @version 1.0.0
 */
import { createContext, useContext, useMemo, type ReactNode, type DragEvent } from 'react';
import type { CanvasInspectorCommand } from '../../stores/canvasInspectorTarget';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';
import type { CanonicalNode } from '../../types/canonical';
import type { useCanvasModelBrowser } from './useCanvasModelBrowser';
import { CanvasProjectElementsExplorer } from './explorer/CanvasProjectElementsExplorer';
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
      copy: (id: string) => boolean;
      label: string;
      referenceLabel?: string;
      linkedNodeIds?: ReadonlySet<string>;
    }>
  ) => ReactNode;
  cataloguePresentation: CanvasExplorerCatalogPresentation;
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
  event.dataTransfer.effectAllowed = composition.linkedNodeIds?.has(id) ? 'link' : 'copy';
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
  const { scopeKey, cataloguePresentation, catalogue } = navigation;
  const items = useMemo(() => {
    const selected = nodes.find((node) => node.id === selectedId);
    const definitionId = workspaceNodeDefinitionId(selected) ?? selectedId;
    return catalogue.map((item) => ({
      ...item,
      selected: item.id === definitionId,
      draggable: false,
    }));
  }, [nodes, catalogue, selectedId]);
  return (
    <CanvasModelBrowser.Provider
      value={{
        ...navigation,
        catalog: (composition) => (
          <CanvasProjectElementsExplorer
            enabled={active && selectedId != null}
            projectRoot={projectRoot}
            items={items.map((item) => ({
              ...item,
              draggable: composition?.nodeIds.has(item.id) === true,
            }))}
            modelAction={
              composition == null
                ? undefined
                : {
                    label: composition.label,
                    ...(composition.referenceLabel == null
                      ? {}
                      : { referenceLabel: composition.referenceLabel }),
                    onActivate: composition.copy,
                  }
            }
            onDragStart={(id, event) => startCompositionDrag(composition, scopeKey, id, event)}
            presentation={cataloguePresentation}
            catalogueScopeKey={canvasId ?? undefined}
            onInspectNode={navigation.onSelect}
            connections={<CanvasWarehouseConnections onManage={onManageConnections} />}
          />
        ),
      }}
    >
      {children}
      <CanvasModelContextPicker
        contexts={navigation.contexts}
        onSelect={navigation.selectContext}
        onClose={navigation.cancelContext}
      />
    </CanvasModelBrowser.Provider>
  );
}
