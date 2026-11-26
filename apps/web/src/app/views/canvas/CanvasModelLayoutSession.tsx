/** Owned concern: adapt settled Model placement to the existing local Canvas layout store. */
import { useCallback, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { jcsCanonicalize } from '@dvt/crypto';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { CardPosition } from './canvasRelationalTreeGeometry';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import { reconcileCanvasModelLayout } from './canvasModelLayoutReconciliation';
import { areCanvasPositionsEqual } from '../../types/canvasPositions';
import type {
  CanvasModelLayoutRetention,
  CanvasModelLayoutTransition,
} from './canvasRelationalTreeWorkbench.types';

function matchingCanvasModelLayoutRetention(
  retention: CanvasModelLayoutRetention | null | undefined,
  before: Readonly<{ layoutKey?: string; identity: string | null }>,
  identity: string | null
): CanvasModelLayoutRetention | null {
  if (retention == null) return null;
  if (retention.layoutKey !== before.layoutKey) return null;
  if (retention.sourceDocumentIdentity !== before.identity) return null;
  if (retention.targetDocumentIdentity !== identity) return null;
  return retention;
}

export function canvasModelLayoutKey(
  scope: WorkspaceScope | undefined,
  canvasId: string,
  modelId: string
): string | undefined {
  return scope == null
    ? undefined
    : JSON.stringify([
        'canvas-model',
        scope.tenantId,
        scope.projectId,
        scope.environmentId,
        canvasId,
        modelId,
      ]);
}

export function CanvasModelLayoutSession({
  layoutKey,
  document,
  initialPositions,
  onPositionsChange,
  transition,
  children,
}: Readonly<{
  layoutKey?: string;
  document?: SubstraitDocument | null;
  initialPositions: ReadonlyMap<string, CardPosition>;
  onPositionsChange: (positions: ReadonlyMap<string, CardPosition>) => void;
  transition?: CanvasModelLayoutTransition;
  children: ReactNode;
}>): JSX.Element | null {
  const hydrated = useCanvasInteractionStore((state) => state._hasHydrated);
  const persisted = useCanvasInteractionStore((state) =>
    layoutKey == null ? undefined : state.canvasLayouts[layoutKey]?.nodePositions
  );
  const save = useCanvasInteractionStore((state) => state.setCanvasNodePositions);
  const positions = useMemo(
    () => (persisted == null ? undefined : new Map(Object.entries(persisted))),
    [persisted]
  );
  const publish = useCallback(
    (next: ReadonlyMap<string, CardPosition>) => {
      if (layoutKey != null) save(layoutKey, Object.fromEntries(next));
      onPositionsChange(next);
    },
    [layoutKey, save, onPositionsChange]
  );
  const identity = useMemo(
    () => (document == null ? null : jcsCanonicalize(document.sidecar)),
    [document]
  );
  const previous = useRef({ layoutKey, document, identity });
  const seed = positions ?? initialPositions;
  const deferred = transition?.pending === true;
  const reconciled = useMemo(() => {
    const before = previous.current;
    if (deferred) return seed;
    if (before.layoutKey !== layoutKey || before.identity === identity) return seed;
    if (before.document == null || document == null) return seed;
    const retained = matchingCanvasModelLayoutRetention(transition?.accepted, before, identity);
    return reconcileCanvasModelLayout(before.document, document, retained?.positions ?? seed);
  }, [document, seed, layoutKey, identity, deferred, transition?.accepted]);
  useLayoutEffect(() => {
    if (layoutKey != null && !hydrated) return;
    if (deferred) return;
    const before = previous.current;
    const retained =
      before.layoutKey === layoutKey && before.identity !== identity
        ? matchingCanvasModelLayoutRetention(transition?.accepted, before, identity)
        : null;
    previous.current = { layoutKey, document, identity };
    if (!areCanvasPositionsEqual(reconciled, seed)) publish(reconciled);
    if (retained != null) transition?.consume(retained);
  }, [document, reconciled, seed, publish, layoutKey, hydrated, identity, deferred, transition]);
  if (layoutKey != null && !hydrated) return null;
  return (
    <RelationalLayoutSession
      key={layoutKey}
      isolated={layoutKey != null}
      initialPositions={reconciled}
      onPositionsChange={publish}
    >
      {children}
    </RelationalLayoutSession>
  );
}
