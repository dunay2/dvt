/**
 * Owned concern: reveal project browsing and delegate selection to existing scoped navigation.
 * @baseline ADR-0069: view intent is presentation state, never a Model aggregate or write command.
 * @decision Register scoped rail callbacks and reuse guarded Model replacement and inspection.
 * @consequence View shortcuts reuse the current selection and never author graph state.
 * @version 1.1.0
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type {
  CanvasInspectorCommand,
  CanvasInspectorRequest,
  CanvasInspectorResource,
} from '../../stores/canvasInspectorTarget';
import {
  useCanvasWorkspaceMenuContributionStore,
  type CanvasModelView,
} from './canvasWorkspaceMenuContributionStore';
import type { useCanvasModelSelection } from './useCanvasModelSelection';
import type { CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasModelNavigationTarget,
  resolveCanvasModelViewEntry,
  type CanvasModelNavigationContext,
} from './canvasModelNavigationTarget';
import { resolveCanvasExplorerCopy } from './explorer/canvasExplorerCopy';
import { projectCanvasExplorerModels } from './explorer/canvasExplorerItems';
import { useCanvasExplorerCatalogPresentation } from './explorer/useCanvasExplorerCatalogPresentation';
import { readCanvasModelNavigationPreference } from './canvasModelNavigationPreference';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

function readCanvasModelTab(canvasId: string | null) {
  const tab = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
  if (tab?.canvasId !== canvasId) return null;
  return {
    view: tab.active ? tab.views?.active : undefined,
    browsingDisabled: tab.views?.disabled === true,
    editorId: tab.active ? tab.nodeId : undefined,
  };
}

function requestedModelId(request: CanvasInspectorRequest, modelIds: ReadonlySet<string>) {
  if (typeof request !== 'string' && request.kind !== 'canonical-node') return null;
  const nodeId = typeof request === 'string' ? request : request.nodeId;
  return modelIds.has(nodeId) ? nodeId : null;
}

export function useCanvasModelBrowser({
  canvasId,
  nodes,
  model,
  projectRoot,
  catalogueUnavailable = false,
  inspectorTarget,
  showCanvas,
  onInspect,
}: Readonly<{
  canvasId: string | null;
  nodes: readonly CanonicalNode[];
  model: ReturnType<typeof useCanvasModelSelection>;
  projectRoot?: string;
  catalogueUnavailable?: boolean;
  inspectorTarget?: CanvasInspectorResource | null;
  showCanvas: () => void;
  onInspect: CanvasInspectorCommand;
}>) {
  const [choice, setChoice] = useState<Readonly<{ owner: object; mode: CanvasModelView }> | null>(
    null
  );
  const catalogueKey = model.scopeKey ?? JSON.stringify([canvasId, projectRoot]);
  const catalogue = useMemo(
    () => projectCanvasExplorerModels(nodes, canvasId ?? undefined),
    [nodes, canvasId]
  );
  const cataloguePresentation = useCanvasExplorerCatalogPresentation(catalogueKey);
  const language = useApplicationLanguageStore((state) => state.language);
  const sourceLabel = resolveCanvasExplorerCopy(language).source;
  const owner = useMemo(
    function createBrowserOwner() {
      return {};
    },
    [catalogueKey, catalogueUnavailable]
  );
  const [pendingContext, setPendingContext] = useState<Readonly<{
    owner: object;
    view: CanvasModelView;
    contexts: readonly CanvasModelNavigationContext[];
  }> | null>(null);
  const currentOwner = useRef<object | null>(null);
  useLayoutEffect(() => {
    currentOwner.current = owner;
    return () => {
      currentOwner.current = null;
    };
  }, [owner]);
  const mode = choice?.owner === owner ? choice.mode : null;
  const selectedId = model.selected?.id;
  const browserCanvasId = catalogueUnavailable ? null : canvasId;
  const revealCanvas = useCallback(() => {
    showCanvas();
    model.setActive(false);
  }, [showCanvas, model.setActive]);
  const reportInspectionFailure = useCallback(() => {
    if (currentOwner.current === owner)
      toast.error(resolveCanvasViewCopy(language).routeErrorTitle);
  }, [language, owner]);
  const onCanvas = useCallback(
    function showBrowserCanvas() {
      if (currentOwner.current !== owner) return;
      setChoice(null);
      setPendingContext(null);
      revealCanvas();
    },
    [owner, revealCanvas]
  );
  const onSelect = useCallback(
    (
      request: CanvasInspectorRequest,
      preferredTab?: string | null,
      requestedView?: CanvasModelView
    ) => {
      if (currentOwner.current !== owner) return false;
      const tab = model.active ? readCanvasModelTab(canvasId) : null;
      const editorView = tab?.view;
      const view = requestedView ?? editorView ?? mode;
      const nodeId = requestedModelId(request, model.modelIds);
      if (view != null && nodeId != null) {
        const target = resolveCanvasModelNavigationTarget(nodeId, nodes, selectedId);
        if (target.kind === 'contexts')
          setPendingContext({ owner, view, contexts: target.contexts });
        else model.open(target.nodeId, view);
        return true;
      }
      if (view === 'semantic') {
        toast.info(resolveCanvasSemanticEditorCopy(language).semanticEditorUnavailable);
        return false;
      }
      revealCanvas();
      return onInspect(request, preferredTab ?? (view === 'sql' ? 'code' : null));
    },
    [
      owner,
      canvasId,
      mode,
      language,
      model.active,
      nodes,
      model.modelIds,
      selectedId,
      model.open,
      revealCanvas,
      onInspect,
    ]
  );
  const onBrowse = useCallback(
    function browseModelView(view: CanvasModelView) {
      if (currentOwner.current !== owner) return;
      if (browserCanvasId == null) return;
      const currentTab = readCanvasModelTab(browserCanvasId);
      if (currentTab?.browsingDisabled) return;

      setChoice({ owner, mode: view });
      setPendingContext(null);
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'expand' });
      const request = resolveCanvasModelViewEntry({
        view,
        nodes,
        catalogue,
        modelIds: model.modelIds,
        activeEditorId: currentTab?.editorId,
        inspected: inspectorTarget,
        selectedId: selectedId,
        rememberedId: readCanvasModelNavigationPreference(model.scopeKey),
        query: cataloguePresentation.query,
        sourceLabel,
      });
      if (request != null) {
        Promise.resolve(onSelect(request, null, view)).catch(reportInspectionFailure);
      } else {
        revealCanvas();
      }
    },
    [
      browserCanvasId,
      owner,
      catalogue,
      nodes,
      inspectorTarget,
      selectedId,
      model.modelIds,
      model.scopeKey,
      cataloguePresentation.query,
      sourceLabel,
      reportInspectionFailure,
      onSelect,
      revealCanvas,
    ]
  );
  useEffect(
    function registerBrowserContribution() {
      if (browserCanvasId == null) return;
      const browser = { canvasId: browserCanvasId, mode, onBrowse, onCanvas };
      const store = useCanvasWorkspaceMenuContributionStore.getState();
      store.registerModelBrowser(browser);
      return () => store.clearModelBrowser(browser);
    },
    [browserCanvasId, mode, onBrowse, onCanvas]
  );
  const picker = pendingContext?.owner === owner ? pendingContext : null;
  const contexts = picker?.contexts.filter((item) => model.modelIds.has(item.nodeId)) ?? [];
  const selectContext = (nodeId: string): void => {
    if (picker?.owner !== currentOwner.current) return;
    if (!contexts.some((item) => item.nodeId === nodeId)) return;
    setPendingContext(null);
    model.open(nodeId, picker.view);
  };
  return {
    scopeKey: model.scopeKey,
    onBrowse,
    catalogue,
    cataloguePresentation,
    mode,
    onSelect,
    contexts,
    selectContext,
    cancelContext: () => {
      if (currentOwner.current === owner) setPendingContext(null);
    },
  };
}
