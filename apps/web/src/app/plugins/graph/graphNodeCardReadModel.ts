/** Owned concern: choose the strategy-owned graph node card projection. */
import { dbtGraphNodeCardStrategy } from '../dbt/dbtGraphNodeCardStrategy';
import { dvtGraphNodeCardStrategy } from '../dvt/dvtGraphNodeCardStrategy';
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

export const GRAPH_NODE_CARD_STRATEGIES: readonly GraphNodeCardStrategy[] = [
  dbtGraphNodeCardStrategy,
  dvtGraphNodeCardStrategy,
];

export function buildGraphNodeCardReadModel(
  node: CanonicalNode,
  data: Record<string, unknown>
): GraphNodeCardReadModel {
  return (
    GRAPH_NODE_CARD_STRATEGIES.find((strategy) => strategy.matches(node)) ??
    defaultGraphNodeCardStrategy
  ).build(node, data);
}
