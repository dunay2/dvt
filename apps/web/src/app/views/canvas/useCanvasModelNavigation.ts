/** Own the existing Model leave decision, including rejection and durable-save outcomes. */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasModelBlockedNavigation } from './CanvasModelNavigationGuard';
import type { CanvasModelPreviewPreparation } from './CanvasModelDataView';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import type { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export type CanvasModelView = 'editor' | 'sql' | 'data';

export function useCanvasModelNavigation({
  initialView,
  viewRequestId,
  workbench,
  onClose,
  preparePreview,
  draftStatus,
  copy,
}: Readonly<{
  initialView: CanvasModelView;
  viewRequestId: number;
  workbench: RefObject<CanvasRelationalTreeWorkbenchHandle>;
  onClose: () => void;
  preparePreview?: CanvasModelPreviewPreparation;
  draftStatus: CanvasDraftStatusState;
  copy: ReturnType<typeof resolveCanvasSemanticEditorCopy>;
}>) {
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
  return {
    view,
    requestNavigation,
    onRouteBlocked,
    requestClose: (continuation?: () => void) => {
      afterClose.current = continuation;
      requestNavigation('canvas');
    },
    decision: {
      open: pendingNavigation != null,
      busy: saving,
      error: navigationError,
      canApply: appliedForNavigation || workbench.current?.canApply === true,
      onStay: stay,
      onApply: applyAndContinue,
      onDiscard: appliedForNavigation
        ? undefined
        : () => {
            workbench.current?.cancel();
            if (pendingNavigation === 'route' && draftStatus.persistence !== 'durable') {
              setAppliedForNavigation(true);
            } else if (pendingNavigation != null) navigate(pendingNavigation);
          },
    },
  };
}
