/** Owned concern: present the existing node workbench in the fixed right inspector slot. */
import { useCallback, useRef } from 'react';
import type {
  CanvasShellChromeCommands,
  CanvasShellLayout,
  CanvasShellPanels,
} from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { findCanvasGraphNodeElement } from './canvasNodeWorkbenchDomGeometry';
import { isCanvasNodeWorkbenchVisible } from './canvasNodeWorkbenchVisibility';
import { canvasNodeWorkbenchVisualTokens } from './canvasNodeWorkbenchVisualTokens';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

export type CanvasNodeWorkbenchOverlayProps = Readonly<{
  layout: Pick<CanvasShellLayout, 'focusMode' | 'inspectorPanelVisible' | 'surfaceStrategy'>;
  panels: Pick<
    CanvasShellPanels,
    | 'activeRunId'
    | 'inspectorAuthoring'
    | 'inspectorGraphEdges'
    | 'inspectorGraphNodes'
    | 'inspectorNode'
    | 'inspectorPreferredTabId'
    | 'inspectorPreferredTabRequestId'
    | 'inspectorWorkbenchContributions'
    | 'registeredPlugins'
  >;
  onOpenModelEditor?: (nodeId: string) => void;
  onHide: CanvasShellChromeCommands['onHideInspector'];
}>;

export function CanvasNodeWorkbenchOverlay({
  layout,
  panels,
  onOpenModelEditor,
  onHide,
}: CanvasNodeWorkbenchOverlayProps): JSX.Element | null {
  const surfaceStrategy = layout.surfaceStrategy;
  const visible = isCanvasNodeWorkbenchVisible({
    focusMode: layout.focusMode,
    inspectorPanelVisible: layout.inspectorPanelVisible,
    surfaceStrategy,
    hasInspectorNode: panels.inspectorNode != null,
  });
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const inspectorNodeId = panels.inspectorNode?.id ?? null;
  const surfaceRef = useRef<HTMLElement>(null);

  const hideAndRestoreNodeFocus = useCallback((): void => {
    const closingFocus = document.activeElement;
    const closingSurface = surfaceRef.current;
    onHide();
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement !== document.body &&
        activeElement !== closingFocus &&
        activeElement.isConnected &&
        !closingSurface?.contains(activeElement)
      )
        return;
      findCanvasGraphNodeElement(inspectorNodeId)?.focus({ preventScroll: true });
    });
  }, [inspectorNodeId, onHide]);

  if (!visible || surfaceStrategy == null || panels.inspectorNode == null) return null;
  return (
    <aside
      ref={surfaceRef}
      data-slot="canvas-node-workbench-overlay"
      aria-label={copy.inspectorEditablePropertiesTitle}
      className={canvasNodeWorkbenchVisualTokens.inspector}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        hideAndRestoreNodeFocus();
      }}
    >
      <CanvasNodeWorkbenchPanel
        node={panels.inspectorNode}
        nodes={panels.inspectorGraphNodes}
        edges={panels.inspectorGraphEdges}
        activeRunId={panels.activeRunId}
        registeredPlugins={panels.registeredPlugins}
        preferredTabId={panels.inspectorPreferredTabId}
        preferredTabRequestId={panels.inspectorPreferredTabRequestId}
        primarySectionIds={surfaceStrategy.nodeWorkbench.sections}
        onClose={hideAndRestoreNodeFocus}
        authoring={panels.inspectorAuthoring}
        contributions={panels.inspectorWorkbenchContributions}
        {...(onOpenModelEditor == null
          ? {}
          : { onOpenSemanticEditor: () => onOpenModelEditor(panels.inspectorNode!.id) })}
      />
    </aside>
  );
}
