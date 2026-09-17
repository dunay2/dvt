/** Owned concern: compose the full-width Model workspace from existing semantic, SQL and data owners. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, Braces, GitBranch, Table2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
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
  draftStatus,
  query,
  preparePreview,
  onClose,
}: Readonly<{
  canvasId: string;
  canvasName: string;
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring?: CanvasRelationalTreeAuthoringContract;
  initialView: CanvasModelView;
  draftStatus: CanvasDraftStatusState;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasModelPreviewPreparation;
  onClose: () => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const treeCopy = resolveCanvasViewCopy(language);
  const workbench = useRef<CanvasRelationalTreeWorkbenchHandle>(null);
  const [view, setView] = useState(initialView);
  const [pendingNavigation, setPendingNavigation] = useState<
    CanvasModelView | 'canvas' | 'route' | null
  >(null);
  const routeNavigation = useRef<CanvasModelBlockedNavigation | null>(null);
  const [saving, setSaving] = useState(false);
  const [appliedForNavigation, setAppliedForNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const onRouteBlocked = useCallback((navigation: CanvasModelBlockedNavigation) => {
    routeNavigation.current = navigation;
    setPendingNavigation('route');
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
  const navigate = (target: CanvasModelView | 'canvas' | 'route') => {
    if (target === 'route') {
      routeNavigation.current?.proceed();
      routeNavigation.current = null;
    } else if (target === 'canvas') onClose();
    else setView(target);
    setPendingNavigation(null);
    setNavigationError(null);
    setAppliedForNavigation(false);
  };
  const stay = () => {
    routeNavigation.current?.reset();
    routeNavigation.current = null;
    setPendingNavigation(null);
    setNavigationError(null);
    setAppliedForNavigation(false);
  };
  const applyAndContinue = async () => {
    if (
      pendingNavigation == null ||
      (!appliedForNavigation && workbench.current?.canApply !== true) ||
      saving
    )
      return;
    if (!appliedForNavigation) {
      flushSync(() => workbench.current?.apply());
      setAppliedForNavigation(true);
    }
    if (pendingNavigation === 'route') {
      setSaving(true);
      try {
        const saved = await preparePreview?.();
        if (saved?.ok !== true) {
          setNavigationError(copy.saveFailed);
          return;
        }
      } catch {
        setNavigationError(copy.saveFailed);
        return;
      } finally {
        setSaving(false);
      }
    }
    navigate(pendingNavigation);
  };
  const requestNavigation = (target: CanvasModelView | 'canvas') => {
    if (workbench.current?.hasUnappliedChanges) setPendingNavigation(target);
    else navigate(target);
  };
  useEffect(() => {
    const preventLostDraft = (event: BeforeUnloadEvent) => {
      if (!saving && !workbench.current?.hasUnappliedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventLostDraft);
    return () => window.removeEventListener('beforeunload', preventLostDraft);
  }, [saving]);
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
      <CanvasModelNavigationGuard workbench={workbench} onBlocked={onRouteBlocked} />
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-(--border-subtle) bg-(--surface-shell) px-4 py-3">
        <Button
          data-slot="canvas-model-back"
          variant="ghost"
          size="sm"
          onClick={() => requestNavigation('canvas')}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {copy.back}
        </Button>
        <span className="hidden text-(--border-default) sm:inline" aria-hidden="true">
          /
        </span>
        <span className="min-w-0 truncate text-xs text-(--text-muted)" title={canvasName}>
          {canvasName}
        </span>
        <Table2 className="size-4 shrink-0 text-(--primary)" aria-hidden="true" />
        <h1 className="min-w-0 truncate text-sm font-semibold" title={transformNode.name}>
          {transformNode.name}
        </h1>
        <span
          role="status"
          className={`ml-auto text-xs ${draftStatus.tone === 'danger' ? 'text-rose-300' : draftStatus.tone === 'warning' ? 'text-amber-200' : 'text-(--text-muted)'}`}
        >
          {draftStatus.label}
        </span>
      </header>
      <div
        role="tablist"
        aria-label={transformNode.name}
        className="flex shrink-0 overflow-x-auto border-b border-(--border-subtle) bg-(--surface-shell) px-3"
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
            className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 py-3 text-xs font-medium text-(--text-muted) hover:text-(--text-strong) aria-selected:border-(--primary) aria-selected:text-(--text-strong) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
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
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                workbench.current?.cancel();
                if (pendingNavigation != null) navigate(pendingNavigation);
              }}
            >
              {copy.discard}
            </AlertDialogAction>
            <AlertDialogAction
              disabled={saving || (!appliedForNavigation && workbench.current?.canApply !== true)}
              onClick={(event) => {
                event.preventDefault();
                void applyAndContinue();
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
