/** Owned concern: resolve the active Canvas graph strategy from the current draft document. */
import { findCanvasRuntimeRegistration } from '../../plugins/graphStrategyRegistry';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import type { CanvasSurfaceStrategy } from '../../plugins/canvasSurfaceStrategyContracts';
import type {
  CanvasGraphAuthoringMode,
  NodeKindRegistration,
} from '../../plugins/nodeTypeContracts';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';

const DEFAULT_CANVAS_AUTHORING_MODE: CanvasGraphAuthoringMode = 'transformation';

export type ActiveCanvasGraphStrategyResolution =
  // The default runtime presents an empty Canvas; command admission still requires ready.
  | {
      kind: 'missing_document';
      executionStrategy: CanvasExecutionStrategy;
      nodeKinds: readonly NodeKindRegistration[];
      strategy: CanvasGraphStrategy;
      surfaceStrategy: CanvasSurfaceStrategy;
    }
  | {
      kind: 'ready';
      canvasKind: CanvasGraphAuthoringMode;
      executionStrategy: CanvasExecutionStrategy;
      nodeKinds: readonly NodeKindRegistration[];
      strategy: CanvasGraphStrategy;
      surfaceStrategy: CanvasSurfaceStrategy;
    }
  | {
      kind: 'unsupported_kind';
      canvasKind: string;
    }
  | {
      kind: 'disabled_plugin';
      canvasKind: string;
      pluginId: string;
      reason?: string;
    };

function normalizeCanvasKind(kind: string): CanvasGraphAuthoringMode {
  return kind.trim().toLowerCase();
}

function resolveDraftCanvasKind(
  draftReadModel: CanvasAuthoringDraftReadModel | undefined
): CanvasGraphAuthoringMode | null {
  const canvasKind = draftReadModel?.record?.draft.canvas.kind;
  if (!canvasKind) {
    return null;
  }

  const normalizedCanvasKind = normalizeCanvasKind(canvasKind);
  return normalizedCanvasKind.length > 0 ? normalizedCanvasKind : null;
}

export function resolveActiveCanvasGraphStrategy(
  draftReadModel: CanvasAuthoringDraftReadModel | undefined,
  capabilities?: RuntimeCapabilities
): ActiveCanvasGraphStrategyResolution {
  const canvasKind = resolveDraftCanvasKind(draftReadModel);
  const effectiveKind = canvasKind ?? DEFAULT_CANVAS_AUTHORING_MODE;
  const runtimeRegistration = findCanvasRuntimeRegistration(effectiveKind, capabilities);
  if (runtimeRegistration == null) {
    const registeredRuntime = findCanvasRuntimeRegistration(effectiveKind);
    if (registeredRuntime != null) {
      const reason = capabilities?.plugins[registeredRuntime.pluginId]?.reason;

      return {
        kind: 'disabled_plugin',
        canvasKind: effectiveKind,
        pluginId: registeredRuntime.pluginId,
        ...(reason == null ? {} : { reason }),
      };
    }

    return {
      kind: 'unsupported_kind',
      canvasKind: effectiveKind,
    };
  }

  const resolved = {
    executionStrategy: runtimeRegistration.executionStrategy,
    nodeKinds: runtimeRegistration.nodeKinds,
    strategy: runtimeRegistration.graphStrategy,
    surfaceStrategy: runtimeRegistration.surfaceStrategy,
  };
  return canvasKind == null
    ? { kind: 'missing_document', ...resolved }
    : { kind: 'ready', canvasKind, ...resolved };
}

export function selectActiveCanvasGraphStrategy(
  resolution: ActiveCanvasGraphStrategyResolution
): CanvasGraphStrategy | null {
  if (isActiveCanvasGraphStrategySupported(resolution)) {
    return resolution.strategy;
  }

  return null;
}

export function selectActiveCanvasSurfaceStrategy(
  resolution: ActiveCanvasGraphStrategyResolution
): CanvasSurfaceStrategy | null {
  if (isActiveCanvasGraphStrategySupported(resolution)) {
    return resolution.surfaceStrategy;
  }

  return null;
}

export function selectActiveCanvasExecutionStrategy(
  resolution: ActiveCanvasGraphStrategyResolution
): CanvasExecutionStrategy | null {
  if (isActiveCanvasGraphStrategySupported(resolution)) {
    return resolution.executionStrategy;
  }

  return null;
}

export function isActiveCanvasGraphStrategySupported(
  resolution: ActiveCanvasGraphStrategyResolution
): resolution is Extract<
  ActiveCanvasGraphStrategyResolution,
  { kind: 'ready' | 'missing_document' }
> {
  return resolution.kind === 'ready' || resolution.kind === 'missing_document';
}
