/** Owned concern: choose the strategy-owned graph node card projection. */
import type { CanonicalNode } from '../../types/canonical';
import { defaultGraphNodeCardStrategy } from './defaultGraphNodeCardStrategy';
import type {
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';

export type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';

export function buildGraphNodeCardReadModel(
  node: CanonicalNode,
  data: Record<string, unknown>,
  strategies: readonly GraphNodeCardStrategy[] = []
): GraphNodeCardReadModel {
  return (
    strategies.find((strategy) => strategy.matches(node)) ?? defaultGraphNodeCardStrategy
  ).build(node, data);
}
