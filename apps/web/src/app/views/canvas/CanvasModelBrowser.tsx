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
import type { useCanvasModelBrowser } from './useCanvasModelBrowser';
import { useWorkspaceDbtProjectContext } from '../code/useWorkspaceDbtProjectContext';
import type { CanvasDbtModelPublication } from './canvasDbtModelCompositionDiscovery';
import { CanvasModelContextPicker } from './CanvasModelContextPicker';
import type { CanvasExplorerCatalogPresentation } from './explorer/CanvasExplorer.types';

export type CanvasModelBrowserPresentation = Readonly<{
  scopeKey: string | null;
  mode: CanvasModelView | null;
  onSelect: CanvasInspectorCommand;
  onManageConnections?: () => void;
  cataloguePresentation: CanvasExplorerCatalogPresentation;
  fileModels?: CanvasDbtModelPublication;
}>;
export const CanvasModelBrowser = createContext<CanvasModelBrowserPresentation | null>(null);
export function useCanvasModelBrowserPresentation(): CanvasModelBrowserPresentation | null {
  return useContext(CanvasModelBrowser);
}

export function CanvasModelBrowserProvider({
  navigation,
  selectedId,
  active,
  projectRoot,
  onManageConnections,
  children,
}: Readonly<{
  navigation: ReturnType<typeof useCanvasModelBrowser>;
  selectedId?: string;
  active: boolean;
  projectRoot?: string;
  onManageConnections?: () => void;
  children: ReactNode;
}>): JSX.Element {
  const { scopeKey, mode, onSelect, cataloguePresentation } = navigation;
  const enabled = active && selectedId != null;
  const projectContext = useWorkspaceDbtProjectContext({
    enabled,
    projectRoot,
  });
  const { projection, refresh } = projectContext;
  const value = useMemo(
    () => ({
      scopeKey,
      mode,
      onSelect,
      cataloguePresentation,
      onManageConnections,
      fileModels: { projection, refresh },
    }),
    [scopeKey, mode, onSelect, cataloguePresentation, onManageConnections, projection, refresh]
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
