import {
  dbtCanvasGraphStrategy,
  transformationCanvasGraphStrategy,
} from './dbt/dbtNodeAdapter';
import type { CanvasGraphStrategy } from './graphStrategyContracts';

const DEFAULT_STRATEGY_ID = 'transformation';

const STRATEGIES: Record<string, CanvasGraphStrategy> = {
  dbt: dbtCanvasGraphStrategy,
  transformation: transformationCanvasGraphStrategy,
};

function normalizeStrategyId(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_STRATEGY_ID;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : DEFAULT_STRATEGY_ID;
}

export function resolveCanvasGraphStrategy(
  strategyId = import.meta.env.VITE_CANVAS_GRAPH_STRATEGY
): CanvasGraphStrategy {
  const resolvedId = normalizeStrategyId(strategyId);
  const defaultStrategy = STRATEGIES[DEFAULT_STRATEGY_ID];
  if (!defaultStrategy) {
    throw new Error('Missing default canvas graph strategy registration');
  }
  return STRATEGIES[resolvedId] ?? defaultStrategy;
}
