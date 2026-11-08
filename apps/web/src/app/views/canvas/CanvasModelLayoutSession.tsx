/** Owned concern: adapt settled Model placement to the existing local Canvas layout store. */
import { useCallback, useMemo, type ReactNode } from 'react';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { CardPosition } from './canvasRelationalTreeGeometry';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';

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
  initialPositions,
  onPositionsChange,
  children,
}: Readonly<{
  layoutKey?: string;
  initialPositions: ReadonlyMap<string, CardPosition>;
  onPositionsChange: (positions: ReadonlyMap<string, CardPosition>) => void;
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
  if (layoutKey != null && !hydrated) return null;
  return (
    <RelationalLayoutSession
      key={layoutKey}
      isolated={layoutKey != null}
      initialPositions={positions ?? initialPositions}
      onPositionsChange={publish}
    >
      {children}
    </RelationalLayoutSession>
  );
}
