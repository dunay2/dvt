/**
 * Owned concern: pass the current Explorer presentation intent to retained surfaces.
 * @baseline ADR-0069: presentation context delegates to the existing Model and Inspector owners.
 * @decision Share one project catalog slot without copying draft or query state.
 * @consequence Native input controls remain independently available in the Model workspace.
 * @version 1.0.0
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { CanvasInspectorCommand } from '../../stores/canvasInspectorTarget';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';
import type { CanonicalNode } from '../../types/canonical';
import type { useCanvasModelBrowser } from './useCanvasModelBrowser';
import { projectCanvasExplorerModels } from './explorer/canvasExplorerItems';
import { CanvasProjectElementsExplorer } from './explorer/CanvasProjectElementsExplorer';
import { CanvasWarehouseConnections } from './explorer/CanvasWarehouseConnections';
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import { CanvasModelContextPicker } from './CanvasModelContextPicker';

export type CanvasModelBrowserPresentation = Readonly<{
  mode: CanvasModelView | null;
  onSelect: CanvasInspectorCommand;
  catalog: ReactNode;
}>;
export const CanvasModelBrowser = createContext<CanvasModelBrowserPresentation | null>(null);
export function useCanvasModelBrowserPresentation(): CanvasModelBrowserPresentation | null {
  return useContext(CanvasModelBrowser);
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
  const items = useMemo(() => {
    const selected = nodes.find((node) => node.id === selectedId);
    const definitionId = workspaceNodeDefinitionId(selected) ?? selectedId;
    return projectCanvasExplorerModels(nodes, canvasId ?? undefined).map((item) => ({
      ...item,
      selected: item.id === definitionId,
      draggable: false,
    }));
  }, [nodes, canvasId, selectedId]);
  return (
    <CanvasModelBrowser.Provider
      value={{
        ...navigation,
        catalog: (
          <CanvasProjectElementsExplorer
            enabled={active && navigation.mode != null}
            projectRoot={projectRoot}
            items={items}
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
