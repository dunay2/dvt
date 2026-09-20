/** Owned concern: compose the full-width Model workspace from existing semantic, SQL and data owners. */
import './canvasSemanticEditor.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Braces, GitBranch, Table2 } from 'lucide-react';
import { useCanvasModelWorkspaceTab } from './useCanvasModelWorkspaceTab';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../components/ui/alert-dialog';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import {
  CanvasRelationalTreeWorkbench,
  type CanvasRelationalTreeWorkbenchHandle,
} from './CanvasRelationalTreeWorkbench';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { projectCanvasRelationalTreeCatalogue } from './canvasRelationalTreeWorkbenchModel';
import { CanvasModelSqlView } from './CanvasModelSqlView';
import { CanvasModelDataView, type CanvasModelPreviewPreparation } from './CanvasModelDataView';
import {
  CanvasModelNavigationGuard,
  type CanvasModelBlockedNavigation,
} from './CanvasModelNavigationGuard';

export type CanvasModelView = 'editor' | 'sql' | 'data';

export function CanvasModelEditor({
  canvasId,
  canvasName,
  transformNode,
  nodes,
  edges,
  authoring,
  initialView,
  viewRequestId,
  draftStatus,
  query,
  preparePreview,
  operationDataHost,
  onOpenOperationData,
  onClose,
  active = true,
  onSelect,
  onShowCanvas,
}: Readonly<{
  canvasId: string;
  canvasName: string;
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring?: CanvasRelationalTreeAuthoringContract;
  initialView: CanvasModelView;
  viewRequestId: number;
  draftStatus: CanvasDraftStatusState;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasModelPreviewPreparation;
  operationDataHost?: HTMLDivElement | null;
  onOpenOperationData?: () => void;
  onClose: () => void;
  active?: boolean;
  onSelect: () => void;
  onShowCanvas: () => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const treeCopy = resolveCanvasViewCopy(language);
  const workbench = useRef<CanvasRelationalTreeWorkbenchHandle>(null);
  const [actionsHost, setActionsHost] = useState<HTMLDivElement | null>(null);
  const [view, setView] = useState(initialView);
  const handledViewRequest = useRef(viewRequestId);
  const [pendingNavigation, setPendingNavigation] = useState<
    CanvasModelView | 'canvas' | 'route' | null
  >(null);
  const routeNavigation = useRef<CanvasModelBlockedNavigation | null>(null);
  const afterClose = useRef<(() => void) | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [appliedForNavigation, setAppliedForNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const applyDecisionInFlight = useRef(false);
  const routeSaveInFlight = useRef(false);
  const onRouteBlocked = useCallback((navigation: CanvasModelBlockedNavigation) => {
    routeNavigation.current = navigation;
    setPendingNavigation('route');
    if (workbench.current?.hasUnappliedChanges !== true) setAppliedForNavigation(true);
  }, []);
  const projection = useMemo(
    () => projectCanvasRelationalTree({ node: transformNode, nodes, edges }),
    [transformNode, nodes, edges]
  );
  const digest = projection.ok ? projection.projection.semanticDigest : null;
  const unresolvedInputs = projection.ok
    ? projectCanvasRelationalTreeCatalogue({ ...projection.projection, nodes }).flatMap((input) =>
        input.state === 'participating' ? [] : [{ label: input.label, state: input.state }]
      )
    : [];
  const navigate = useCallback(
    (target: CanvasModelView | 'canvas' | 'route') => {
      if (target === 'route') {
        routeNavigation.current?.proceed();
        routeNavigation.current = null;
      } else if (target === 'canvas') {
        const continuation = afterClose.current;
        afterClose.current = undefined;
        if (continuation != null) continuation();
        else onClose();
      } else setView(target);
      routeSaveInFlight.current = false;
      applyDecisionInFlight.current = false;
      setPendingNavigation(null);
      setNavigationError(null);
      setAppliedForNavigation(false);
    },
    [onClose]
  );
  const stay = useCallback(() => {
    afterClose.current = undefined;
    routeNavigation.current?.reset();
    routeNavigation.current = null;
    routeSaveInFlight.current = false;
    applyDecisionInFlight.current = false;
    setPendingNavigation(null);
    setNavigationError(null);
    setAppliedForNavigation(false);
  }, []);
  const applyAndContinue = () => {
    if (
      pendingNavigation == null ||
      (!appliedForNavigation && workbench.current?.canApply !== true) ||
      saving
    )
      return;
    if (appliedForNavigation) {
      setNavigationError(null);
      return;
    }
    if (applyDecisionInFlight.current) return;
    applyDecisionInFlight.current = true;
    const result = workbench.current?.apply();
    if (result?.outcome === 'rejected') {
      applyDecisionInFlight.current = false;
      setNavigationError(
        result.reason === 'node_unavailable' ? copy.applyNodeUnavailable : copy.applyRejected
      );
      return;
    }
    if (result != null) {
      setNavigationError(null);
      setAppliedForNavigation(true);
    } else applyDecisionInFlight.current = false;
  };
  useEffect(() => {
    if (
      !appliedForNavigation ||
      pendingNavigation == null ||
      workbench.current?.hasUnappliedChanges === true ||
      navigationError != null
    )
      return;
    if (pendingNavigation !== 'route') {
      navigate(pendingNavigation);
      return;
    }
    if (routeSaveInFlight.current) return;
    routeSaveInFlight.current = true;
    setSaving(true);
    void (async () => {
      try {
        const saved = await preparePreview?.();
        if (saved?.ok !== true) {
          setNavigationError(copy.saveFailed);
          return;
        }
        navigate('route');
      } catch {
        setNavigationError(copy.saveFailed);
      } finally {
        routeSaveInFlight.current = false;
        setSaving(false);
      }
    })();
  }, [
    appliedForNavigation,
    copy.saveFailed,
    navigate,
    navigationError,
    pendingNavigation,
    preparePreview,
  ]);
  const requestNavigation = (target: CanvasModelView | 'canvas') => {
    if (target === view) return;
    if (workbench.current?.hasUnappliedChanges) setPendingNavigation(target);
    else navigate(target);
  };
  useEffect(() => {
    if (handledViewRequest.current === viewRequestId) return;
    handledViewRequest.current = viewRequestId;
    requestNavigation(initialView);
  });
  useCanvasModelWorkspaceTab({
    canvasId,
    nodeId: transformNode.id,
    label: transformNode.name,
    active,
    onSelect,
    onCanvas: onShowCanvas,
    onClose: (continuation) => {
      afterClose.current = continuation;
      onSelect();
      requestNavigation('canvas');
    },
  });
  useEffect(() => {
    const preventLostDraft = (event: BeforeUnloadEvent) => {
      if (
        !saving &&
        !workbench.current?.hasUnappliedChanges &&
        draftStatus.persistence === 'durable'
      )
        return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventLostDraft);
    return () => window.removeEventListener('beforeunload', preventLostDraft);
  }, [draftStatus.persistence, saving]);
  const tabs = [
    { id: 'editor', label: copy.editor, icon: GitBranch },
    { id: 'sql', label: copy.sql, icon: Braces },
    { id: 'data', label: copy.data, icon: Table2 },
  ] as const;
  return (
    <section
      data-slot="canvas-model-editor"
      aria-label={`${transformNode.name} · ${copy.editor}`}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--surface-app) text-(--text-default)"
    >
      <CanvasModelNavigationGuard
        workbench={workbench}
        hasUnpersistedChanges={draftStatus.persistence !== 'durable'}
        onBlocked={onRouteBlocked}
      />
      <header
        data-slot="canvas-model-toolbar"
        className="flex shrink-0 flex-wrap items-center gap-x-3 border-b border-(--border-subtle) bg-(--surface-shell) px-3"
      >
        <Table2 className="size-4 shrink-0 text-(--primary)" aria-hidden="true" />
        <h1
          className="max-w-48 truncate text-sm font-semibold"
          title={`${canvasName} / ${transformNode.name}`}
        >
          {transformNode.name}
        </h1>
        <div
          role="tablist"
          aria-label={transformNode.name}
          className="flex min-w-0 overflow-x-auto self-stretch"
        >
          {tabs.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`model-tab-${id}`}
              aria-controls={`model-panel-${id}`}
              aria-selected={view === id}
              tabIndex={view === id ? 0 : -1}
              data-slot="canvas-model-view-tab"
              data-view={id}
              className="flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-xs font-medium text-(--text-muted) hover:text-(--text-strong) aria-selected:border-(--primary) aria-selected:text-(--text-strong) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
              onClick={() => requestNavigation(id)}
              onKeyDown={(event) => {
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : null;
                if (next == null) return;
                event.preventDefault();
                requestNavigation(tabs[next]!.id);
                document.getElementById(`model-tab-${tabs[next]!.id}`)?.focus();
              }}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <span
          role="status"
          data-slot="canvas-model-save-status"
          className={`ml-auto py-1 text-[11px] ${draftStatus.tone === 'danger' ? 'text-rose-300' : draftStatus.tone === 'warning' ? 'text-amber-200' : 'text-(--text-muted)'}`}
        >
          {draftStatus.label}
        </span>
        <div
          ref={setActionsHost}
          data-slot="canvas-model-actions"
          className="ml-auto flex items-center empty:hidden"
        />
      </header>
      <div
        id="model-panel-editor"
        role="tabpanel"
        aria-labelledby="model-tab-editor"
        className={view === 'editor' ? 'flex min-h-0 min-w-0 flex-1 overflow-hidden' : 'hidden'}
      >
        <CanvasRelationalTreeWorkbench
          ref={workbench}
          transformNode={transformNode}
          nodes={nodes}
          edges={edges}
          copy={treeCopy}
          authoring={authoring}
          actionsHost={actionsHost}
          preview={{
            canvasId,
            query,
            preparePreview,
            dataHost: active && view === 'editor' ? operationDataHost : null,
            onOpenData: active && view === 'editor' ? onOpenOperationData : undefined,
          }}
        />
      </div>
      {view === 'sql' ? (
        <div
          id="model-panel-sql"
          role="tabpanel"
          aria-labelledby="model-tab-sql"
          className="min-h-0 flex-1"
        >
          <CanvasModelSqlView
            transformNode={transformNode}
            nodes={nodes}
            edges={edges}
            copy={copy}
          />
        </div>
      ) : null}
      <div
        id="model-panel-data"
        role="tabpanel"
        aria-labelledby="model-tab-data"
        className={view === 'data' ? 'min-h-0 flex-1' : 'hidden'}
      >
        <CanvasModelDataView
          canvasId={canvasId}
          nodeId={transformNode.id}
          nodeName={transformNode.name}
          semanticDigest={digest}
          canEditModel={authoring?.canEditNode === true}
          query={query}
          preparePreview={preparePreview}
          copy={copy}
          unresolvedInputs={unresolvedInputs}
          onReviewInputs={() => requestNavigation('editor')}
        />
      </div>
      <AlertDialog
        open={pendingNavigation != null}
        onOpenChange={(open) => {
          if (!open && !saving) stay();
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{copy.leaveTitle}</AlertDialogTitle>
          <AlertDialogDescription>{copy.leaveDescription}</AlertDialogDescription>
          {navigationError == null ? null : (
            <p role="alert" className="text-sm text-rose-300">
              {navigationError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{copy.stay}</AlertDialogCancel>
            {appliedForNavigation ? null : (
              <AlertDialogAction
                disabled={saving}
                onClick={(event) => {
                  event.preventDefault();
                  workbench.current?.cancel();
                  if (pendingNavigation === 'route' && draftStatus.persistence !== 'durable') {
                    setAppliedForNavigation(true);
                  } else if (pendingNavigation != null) navigate(pendingNavigation);
                }}
              >
                {copy.discard}
              </AlertDialogAction>
            )}
            <AlertDialogAction
              disabled={saving || (!appliedForNavigation && workbench.current?.canApply !== true)}
              onClick={(event) => {
                event.preventDefault();
                applyAndContinue();
              }}
            >
              {copy.apply}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
