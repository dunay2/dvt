/** Owned concern: resolve the active Canvas graph strategy from the current draft document. */
import {
  findCanvasRuntimeRegistration,
  resolveCanvasGraphStrategy,
} from '../../plugins/graphStrategyRegistry';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import type {
  CanvasGraphAuthoringMode,
  NodeKindRegistration,
} from '../../plugins/nodeTypeContracts';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';

const DEFAULT_CANVAS_AUTHORING_MODE: CanvasGraphAuthoringMode = 'transformation';

export type ActiveCanvasGraphStrategyResolution =
  | {
      kind: 'missing_document';
      executionStrategy: CanvasExecutionStrategy;
      nodeKinds: readonly NodeKindRegistration[];
      strategy: CanvasGraphStrategy;
    }
  | {
      kind: 'ready';
      canvasKind: CanvasGraphAuthoringMode;
      executionStrategy: CanvasExecutionStrategy;
      nodeKinds: readonly NodeKindRegistration[];
      strategy: CanvasGraphStrategy;
    }
  | {
      kind: 'unsupported_kind';
      canvasKind: string;
    };

function normalizeCanvasKind(kind: string): CanvasGraphAuthoringMode {
  return kind.trim().toLowerCase();
}

function resolveDraftCanvasKind(
  draftReadModel: CanvasDraftReadModel | undefined
): CanvasGraphAuthoringMode | null {
  const canvasKind = draftReadModel?.record?.draft.canvas.kind;
  if (!canvasKind) {
    return null;
  }

  const normalizedCanvasKind = normalizeCanvasKind(canvasKind);
  return normalizedCanvasKind.length > 0 ? normalizedCanvasKind : null;
}

export function resolveActiveCanvasGraphStrategy(
  draftReadModel: CanvasDraftReadModel | undefined,
  capabilities?: RuntimeCapabilities
): ActiveCanvasGraphStrategyResolution {
  const canvasKind = resolveDraftCanvasKind(draftReadModel);
  if (canvasKind == null) {
    const defaultRuntimeRegistration = findCanvasRuntimeRegistration(
      undefined,
      capabilities
    );
    if (defaultRuntimeRegistration == null) {
      throw new Error('Missing default canvas runtime registration');
    }

    return {
      kind: 'missing_document',
      executionStrategy: defaultRuntimeRegistration.executionStrategy,
      nodeKinds: defaultRuntimeRegistration.nodeKinds,
      strategy: defaultRuntimeRegistration.graphStrategy,
    };
  }

  const runtimeRegistration = findCanvasRuntimeRegistration(canvasKind, capabilities);
  if (runtimeRegistration == null) {
    return {
      kind: 'unsupported_kind',
      canvasKind,
    };
  }

  return {
    kind: 'ready',
    canvasKind,
    executionStrategy: runtimeRegistration.executionStrategy,
    nodeKinds: runtimeRegistration.nodeKinds,
    strategy: runtimeRegistration.graphStrategy,
  };
}

export function selectActiveCanvasGraphStrategy(
  resolution: ActiveCanvasGraphStrategyResolution,
  capabilities?: RuntimeCapabilities
): CanvasGraphStrategy {
  return resolution.kind === 'unsupported_kind'
    ? resolveCanvasGraphStrategy(undefined, capabilities)
    : resolution.strategy;
}

export function selectActiveCanvasExecutionStrategy(
  resolution: ActiveCanvasGraphStrategyResolution,
  capabilities?: RuntimeCapabilities
): CanvasExecutionStrategy {
  if (resolution.kind !== 'unsupported_kind') {
    return resolution.executionStrategy;
  }

  const defaultRuntimeRegistration = findCanvasRuntimeRegistration(undefined, capabilities);
  if (defaultRuntimeRegistration == null) {
    return {
      kind: 'not_executable',
    };
  }

  return defaultRuntimeRegistration.executionStrategy;
}

export function isActiveCanvasGraphStrategySupported(
  resolution: ActiveCanvasGraphStrategyResolution
): boolean {
  return resolution.kind !== 'unsupported_kind';
}

export function resolveActiveCanvasAuthoringMode(
  draftReadModel: CanvasDraftReadModel | undefined
): CanvasGraphAuthoringMode {
  return resolveDraftCanvasKind(draftReadModel) ?? DEFAULT_CANVAS_AUTHORING_MODE;
}
