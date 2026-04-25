/** Owned concern: resolve the active Canvas graph strategy from the current draft document. */
import {
  findCanvasGraphStrategy,
  resolveCanvasGraphStrategy,
} from '../../plugins/graphStrategyRegistry';
import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import type { CanvasGraphAuthoringMode } from '../../plugins/nodeTypeContracts';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';

const DEFAULT_CANVAS_AUTHORING_MODE: CanvasGraphAuthoringMode = 'transformation';

export type ActiveCanvasGraphStrategyResolution =
  | {
      kind: 'missing_document';
      strategy: CanvasGraphStrategy;
    }
  | {
      kind: 'ready';
      canvasKind: CanvasGraphAuthoringMode;
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
    return {
      kind: 'missing_document',
      strategy: resolveCanvasGraphStrategy(undefined, capabilities),
    };
  }

  const strategy = findCanvasGraphStrategy(canvasKind, capabilities);
  if (strategy == null) {
    return {
      kind: 'unsupported_kind',
      canvasKind,
    };
  }

  return {
    kind: 'ready',
    canvasKind,
    strategy,
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
