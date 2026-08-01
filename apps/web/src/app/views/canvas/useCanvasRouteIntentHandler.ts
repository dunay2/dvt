/** Owned concern: execute a canonical Canvas route intent once through existing Canvas commands. */
import { useEffect, useRef } from 'react';

import type { CanvasRouteIntent } from './canvasLegacyRouteIntent';
import type { CanvasShellRouteIntentRequest } from './canvasShell.types';

export type CanvasRouteIntentHandlerArgs = Readonly<{
  request: CanvasShellRouteIntentRequest | null;
  columnLevelLineageEnabled: boolean;
  canOpenProjectCode: boolean;
  onOpenProjectCode: () => void;
  onToggleColumnLevelLineage: () => void;
}>;

function getCanvasRouteIntentKey(intent: CanvasRouteIntent): string {
  switch (intent.kind) {
    case 'open-contextual-workbench':
      return `${intent.kind}:${intent.workbenchId}`;
    case 'enable-lens':
      return `${intent.kind}:${intent.lensId}`;
    case 'unavailable-legacy-surface':
      return `${intent.kind}:${intent.surfaceId}`;
  }
}

export function useCanvasRouteIntentHandler({
  request,
  columnLevelLineageEnabled,
  canOpenProjectCode,
  onOpenProjectCode,
  onToggleColumnLevelLineage,
}: CanvasRouteIntentHandlerArgs): void {
  const lastHandledIntentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (request == null) {
      lastHandledIntentKeyRef.current = null;
      return;
    }

    const { intent } = request;
    const intentKey = getCanvasRouteIntentKey(intent);
    if (lastHandledIntentKeyRef.current === intentKey) {
      return;
    }

    switch (intent.kind) {
      case 'open-contextual-workbench':
        if (!canOpenProjectCode) {
          return;
        }
        onOpenProjectCode();
        break;
      case 'enable-lens':
        if (!columnLevelLineageEnabled) {
          onToggleColumnLevelLineage();
        }
        break;
      case 'unavailable-legacy-surface':
        request.onUnavailableLegacySurface(intent.surfaceId);
        break;
    }

    lastHandledIntentKeyRef.current = intentKey;
    request.onConsumed();
  }, [
    canOpenProjectCode,
    columnLevelLineageEnabled,
    request,
    onOpenProjectCode,
    onToggleColumnLevelLineage,
  ]);
}
