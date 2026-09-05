import type { CanvasGraphStrategy } from './graphStrategyContracts';
import type { CanvasSurfaceStrategy } from './canvasSurfaceStrategyContracts';
import type { GraphNodeCardStrategy } from './graph/graphNodeCardStrategyContracts';
import {
  getAllCanvasRuntimeRegistrations,
  getRuntimePlugins,
  type RuntimeCapabilities,
} from './registry';
import type { CanvasRuntimeRegistration } from './nodeTypeContracts';

const DEFAULT_STRATEGY_ID = 'transformation';

function normalizeStrategyId(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_STRATEGY_ID;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : DEFAULT_STRATEGY_ID;
}

export function getCanvasRuntimeRegistrations(
  capabilities?: RuntimeCapabilities
): CanvasRuntimeRegistration[] {
  return getAllCanvasRuntimeRegistrations(capabilities);
}

export function findCanvasRuntimeRegistration(
  strategyId: unknown,
  capabilities?: RuntimeCapabilities
): CanvasRuntimeRegistration | null {
  const resolvedId = normalizeStrategyId(strategyId);
  return (
    getCanvasRuntimeRegistrations(capabilities).find(
      (registration) => registration.kind === resolvedId
    ) ?? null
  );
}

export function findCanvasGraphStrategy(
  strategyId: unknown,
  capabilities?: RuntimeCapabilities
): CanvasGraphStrategy | null {
  return findCanvasRuntimeRegistration(strategyId, capabilities)?.graphStrategy ?? null;
}

export function findCanvasSurfaceStrategy(
  strategyId: unknown,
  capabilities?: RuntimeCapabilities
): CanvasSurfaceStrategy | null {
  return findCanvasRuntimeRegistration(strategyId, capabilities)?.surfaceStrategy ?? null;
}

export function getGraphNodeCardStrategies(
  capabilities?: RuntimeCapabilities
): GraphNodeCardStrategy[] {
  const uniqueStrategies = new Map<string, GraphNodeCardStrategy>();

  for (const strategy of getRuntimePlugins(capabilities).flatMap(
    (plugin) => plugin.graphNodeCardStrategies ?? []
  )) {
    if (!uniqueStrategies.has(strategy.id)) {
      uniqueStrategies.set(strategy.id, strategy);
    }
  }

  return [...uniqueStrategies.values()];
}

export function resolveCanvasGraphStrategy(
  strategyId = import.meta.env.VITE_CANVAS_GRAPH_STRATEGY,
  capabilities?: RuntimeCapabilities
): CanvasGraphStrategy {
  const resolvedId = normalizeStrategyId(strategyId);
  const defaultStrategy = findCanvasGraphStrategy(DEFAULT_STRATEGY_ID, capabilities);
  if (!defaultStrategy) {
    throw new Error('Missing default canvas graph strategy registration');
  }
  if (resolvedId === DEFAULT_STRATEGY_ID) {
    return defaultStrategy;
  }

  const strategy = findCanvasGraphStrategy(resolvedId, capabilities);
  if (!strategy) {
    throw new Error(`Unknown canvas graph strategy registration: ${resolvedId}`);
  }

  return strategy;
}

export function resolveCanvasSurfaceStrategy(
  strategyId = import.meta.env.VITE_CANVAS_GRAPH_STRATEGY,
  capabilities?: RuntimeCapabilities
): CanvasSurfaceStrategy {
  const resolvedId = normalizeStrategyId(strategyId);
  const defaultStrategy = findCanvasSurfaceStrategy(DEFAULT_STRATEGY_ID, capabilities);
  if (!defaultStrategy) {
    throw new Error('Missing default canvas surface strategy registration');
  }
  if (resolvedId === DEFAULT_STRATEGY_ID) {
    return defaultStrategy;
  }

  const strategy = findCanvasSurfaceStrategy(resolvedId, capabilities);
  if (!strategy) {
    throw new Error(`Unknown canvas surface strategy registration: ${resolvedId}`);
  }

  return strategy;
}
