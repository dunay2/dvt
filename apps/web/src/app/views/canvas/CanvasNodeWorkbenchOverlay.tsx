/**
 * Owned concern: present the existing node workbench in the fixed right inspector slot.
 * Reason: inspection and guarded close retain their existing resource and copy owners.
 * Corner invariant: a rejected or stale close cannot move focus or report another owner's failure.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useOptionalCanvasTransformSqlQueryPort } from '../../services/AppServicesContext';
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
import { CanvasCatalogFileInspector } from './CanvasCatalogFileInspector';

export type CanvasNodeWorkbenchOverlayProps = Readonly<{
  layout: Pick<CanvasShellLayout, 'focusMode' | 'inspectorPanelVisible' | 'surfaceStrategy'>;
  panels: Pick<
    CanvasShellPanels,
    | 'activeRunId'
    | 'activeCanvasId'
    | 'inspectorAuthoring'
    | 'inspectorGraphEdges'
    | 'inspectorGraphNodes'
    | 'inspectorNode'
    | 'inspectorTarget'
    | 'inspectorPreferredTabId'
    | 'inspectorPreferredTabRequestId'
    | 'inspectorWorkbenchContributions'
    | 'registeredPlugins'
  >;
  onOpenModelEditor?: (nodeId: string) => void;
  currentProjectRoot?: string;
  onHide: CanvasShellChromeCommands['onHideInspector'];
}>;

export function CanvasNodeWorkbenchOverlay({
  layout,
  panels,
  onOpenModelEditor,
  currentProjectRoot,
  onHide,
}: CanvasNodeWorkbenchOverlayProps): JSX.Element | null {
  const surfaceStrategy = layout.surfaceStrategy;
  const visible = isCanvasNodeWorkbenchVisible({
    focusMode: layout.focusMode,
    inspectorPanelVisible: layout.inspectorPanelVisible,
    surfaceStrategy,
    hasInspectorNode:
      panels.inspectorNode != null || panels.inspectorTarget?.kind === 'dbt-file-model',
  });
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const sqlQuery = useOptionalCanvasTransformSqlQueryPort();
  const workspaceScope = panels.inspectorAuthoring.workspaceScope;
  const scopeKey =
    workspaceScope == null
      ? undefined
      : `${workspaceScope.tenantId}::${workspaceScope.projectId}::${workspaceScope.environmentId}`;
  const codeProjection = useMemo(
    () =>
      panels.activeCanvasId == null || sqlQuery == null
        ? undefined
        : { canvasId: panels.activeCanvasId, query: sqlQuery, scopeKey },
    [panels.activeCanvasId, sqlQuery, scopeKey]
  );
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const inspectorNodeId =
    panels.inspectorNode?.id ??
    (panels.inspectorTarget?.kind === 'dbt-file-model' ? panels.inspectorTarget.uniqueId : null);
  const surfaceRef = useRef<HTMLElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const openerRef = useRef<HTMLElement | null>(null);
  const owner = useMemo(
    () => ({ target: panels.inspectorTarget, inspectorNodeId, scopeKey, currentProjectRoot }),
    [panels.inspectorTarget, inspectorNodeId, scopeKey, currentProjectRoot]
  );
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  useEffect(() => {
    const element = document.activeElement;
    if (
      element instanceof HTMLElement &&
      element !== document.body &&
      !surfaceRef.current?.contains(element)
    ) {
      openerRef.current = element;
    }
  }, [panels.inspectorTarget, inspectorNodeId]);

  const hideAndRestoreNodeFocus = useCallback(async (): Promise<void> => {
    const owner = currentOwner.current;
    const closingFocus = document.activeElement;
    const closingSurface = surfaceRef.current;
    try {
      if ((await onHide()) === false || !mounted.current || currentOwner.current !== owner) return;
    } catch {
      if (mounted.current && currentOwner.current === owner)
        toast.error(copy.nodeWorkbenchCloseFailedMessage);
      return;
    }
    window.requestAnimationFrame(() => {
      if (!mounted.current || currentOwner.current !== owner) return;
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement !== document.body &&
        activeElement !== closingFocus &&
        activeElement.isConnected &&
        !closingSurface?.contains(activeElement)
      )
        return;
      const node = findCanvasGraphNodeElement(inspectorNodeId);
      (
        node?.querySelector<HTMLElement>('[data-slot="canvas-node-shell"][tabindex="0"]') ??
        node ??
        (openerRef.current?.isConnected ? openerRef.current : null)
      )?.focus({
        preventScroll: true,
      });
    });
  }, [inspectorNodeId, onHide, panels.inspectorTarget, copy.nodeWorkbenchCloseFailedMessage]);
  const requestHide = useCallback((): void => {
    // This adapter handles both cancellation and failures before its promise settles.
    void hideAndRestoreNodeFocus();
  }, [hideAndRestoreNodeFocus]);

  if (!visible || surfaceStrategy == null) return null;
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
        requestHide();
      }}
    >
      {panels.inspectorTarget?.kind === 'dbt-file-model' ? (
        <CanvasCatalogFileInspector
          target={panels.inspectorTarget}
          workspaceScope={workspaceScope}
          currentProjectRoot={currentProjectRoot}
          visible={visible}
        >
          {(inspection) => (
            <CanvasNodeWorkbenchPanel
              node={inspection.node}
              nodes={inspection.nodes}
              edges={inspection.edges}
              activeRunId={null}
              registeredPlugins={panels.registeredPlugins}
              preferredTabId={panels.inspectorPreferredTabId}
              preferredTabRequestId={panels.inspectorPreferredTabRequestId}
              primarySectionIds={surfaceStrategy.nodeWorkbench.sections}
              onClose={requestHide}
              authoring={{ ...panels.inspectorAuthoring, canEditNode: false }}
              contributions={inspection.contributions}
            />
          )}
        </CanvasCatalogFileInspector>
      ) : panels.inspectorNode == null ? null : (
        <CanvasNodeWorkbenchPanel
          node={panels.inspectorNode}
          nodes={panels.inspectorGraphNodes}
          edges={panels.inspectorGraphEdges}
          activeRunId={panels.activeRunId}
          registeredPlugins={panels.registeredPlugins}
          preferredTabId={panels.inspectorPreferredTabId}
          preferredTabRequestId={panels.inspectorPreferredTabRequestId}
          primarySectionIds={surfaceStrategy.nodeWorkbench.sections}
          onClose={requestHide}
          authoring={panels.inspectorAuthoring}
          contributions={panels.inspectorWorkbenchContributions}
          codeProjection={codeProjection}
          {...(onOpenModelEditor == null
            ? {}
            : { onOpenSemanticEditor: () => onOpenModelEditor(panels.inspectorNode!.id) })}
        />
      )}
    </aside>
  );
}
