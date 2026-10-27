/** Own the existing Model leave decision, including rejection and durable-save outcomes. */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasModelBlockedNavigation } from './CanvasModelNavigationGuard';
import type { CanvasModelPreviewPreparation } from './canvasDraftLifecycle.types';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import type { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { formatCanvasModelOutputDependencyRejection } from './canvasCopyFormatting';

export function useCanvasModelNavigation({
  workbench,
  onClose,
  preparePreview,
  draftStatus,
  copy,
}: Readonly<{
  workbench: RefObject<CanvasRelationalTreeWorkbenchHandle>;
  onClose: () => void;
  preparePreview?: CanvasModelPreviewPreparation;
  draftStatus: CanvasDraftStatusState;
  copy: ReturnType<typeof resolveCanvasSemanticEditorCopy>;
}>) {
  const [pendingNavigation, setPendingNavigation] = useState<'canvas' | 'route' | null>(null);
  const routeNavigation = useRef<CanvasModelBlockedNavigation | null>(null);
  const afterClose = useRef<(() => void) | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [appliedForNavigation, setAppliedForNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const applyDecisionInFlight = useRef<object | null>(null);
  const routeSaveInFlight = useRef<object | null>(null);
  useEffect(
    () => () => {
      applyDecisionInFlight.current = null;
      routeSaveInFlight.current = null;
    },
    []
  );
  const onRouteBlocked = useCallback((navigation: CanvasModelBlockedNavigation) => {
    routeNavigation.current = navigation;
    setPendingNavigation('route');
    if (workbench.current?.hasUnappliedChanges !== true) setAppliedForNavigation(true);
  }, []);
  const navigate = useCallback(
    (target: 'canvas' | 'route') => {
      if (target === 'route') {
        routeNavigation.current?.proceed();
        routeNavigation.current = null;
      } else if (target === 'canvas') {
        const continuation = afterClose.current;
        afterClose.current = undefined;
        if (continuation != null) continuation();
        else onClose();
      }
      routeSaveInFlight.current = null;
      setSaving(false);
      applyDecisionInFlight.current = null;
      setApplying(false);
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
    routeSaveInFlight.current = null;
    setSaving(false);
    applyDecisionInFlight.current = null;
    setApplying(false);
    setPendingNavigation(null);
    setNavigationError(null);
    setAppliedForNavigation(false);
  }, []);
  const applyAndContinue = async () => {
    if (
      pendingNavigation == null ||
      (!appliedForNavigation && workbench.current?.canApply !== true) ||
      saving ||
      applying
    )
      return;
    if (appliedForNavigation) {
      setNavigationError(null);
      return;
    }
    if (applyDecisionInFlight.current != null) return;
    const decision = {};
    applyDecisionInFlight.current = decision;
    setApplying(true);
    try {
      const result = await workbench.current?.apply();
      if (applyDecisionInFlight.current !== decision) return;
      if (result?.outcome === 'rejected') {
        setNavigationError(
          result.reason === 'model_output_required' ||
            result.reason === 'model_output_dependency_unavailable'
            ? formatCanvasModelOutputDependencyRejection(result)
            : result.reason === 'node_unavailable'
              ? copy.applyNodeUnavailable
              : copy.applyRejected
        );
      } else if (result != null) {
        setNavigationError(null);
        setAppliedForNavigation(true);
      }
    } catch {
      if (applyDecisionInFlight.current === decision) setNavigationError(copy.applyRejected);
    } finally {
      if (applyDecisionInFlight.current === decision) {
        applyDecisionInFlight.current = null;
        setApplying(false);
      }
    }
  };
  useEffect(() => {
    if (!appliedForNavigation || pendingNavigation == null || navigationError != null) return;
    if (pendingNavigation !== 'route') {
      navigate(pendingNavigation);
      return;
    }
    if (routeSaveInFlight.current != null) return;
    const decision = {};
    routeSaveInFlight.current = decision;
    setSaving(true);
    void (async () => {
      try {
        const saved = await preparePreview?.();
        if (routeSaveInFlight.current !== decision) return;
        if (saved?.ok !== true) {
          setNavigationError(copy.saveFailed);
          return;
        }
        navigate('route');
      } catch {
        if (routeSaveInFlight.current === decision) setNavigationError(copy.saveFailed);
      } finally {
        if (routeSaveInFlight.current === decision) {
          routeSaveInFlight.current = null;
          setSaving(false);
        }
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
  const requestNavigation = (target: 'canvas') => {
    if (workbench.current?.hasUnappliedChanges) setPendingNavigation(target);
    else navigate(target);
  };
  useEffect(() => {
    const preventLostDraft = (event: BeforeUnloadEvent) => {
      if (
        !saving &&
        applyDecisionInFlight.current == null &&
        routeSaveInFlight.current == null &&
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
    onRouteBlocked,
    requestClose: (continuation?: () => void) => {
      afterClose.current = continuation;
      requestNavigation('canvas');
    },
    decision: {
      open: pendingNavigation != null,
      busy: saving || applying,
      error: navigationError,
      canApply: appliedForNavigation || workbench.current?.canApply === true,
      onStay: stay,
      onApply: () => {
        void applyAndContinue();
      },
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
