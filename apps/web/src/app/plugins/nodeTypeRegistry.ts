import type { PluginNodeKind } from '../types/canonical';

import { CANVAS_NODE_KINDS, EDGE_TYPE_STRATEGIES, FALLBACK_NODE_KIND } from './nodeTypeCatalog';
import type {
  CanvasEdgeType,
  EdgeTypeStrategyContext,
  NodeKindRegistration,
} from './nodeTypeContracts';

export type { CanvasEdgeType, EdgeTypeStrategyContext, NodeKindRegistration };

const registry = new Map<PluginNodeKind, NodeKindRegistration>(
  CANVAS_NODE_KINDS.map((definition) => [definition.kind, definition])
);

export function resolveNodeKindRegistration(kind: string): NodeKindRegistration {
  return registry.get(kind as PluginNodeKind) ?? FALLBACK_NODE_KIND;
}

export function resolveCanvasEdgeType(context: EdgeTypeStrategyContext): CanvasEdgeType {
  const strategy = EDGE_TYPE_STRATEGIES.find((rule) => rule.matches(context));
  return strategy?.edgeType ?? 'ref';
}
