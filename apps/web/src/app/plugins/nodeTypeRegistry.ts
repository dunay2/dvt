import type { CoreNodeRole, PluginNodeKind } from '../types/canonical';

import {
  CANVAS_NODE_KINDS,
  CONNECTION_RULES,
  EDGE_TYPE_STRATEGIES,
  FALLBACK_NODE_KIND,
} from './nodeTypeCatalog';
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

export function resolvePreviewStepKind(kind: string, role: CoreNodeRole): string {
  const registration = resolveNodeKindRegistration(kind);
  if (registration.previewStepKind) {
    return registration.previewStepKind;
  }

  switch (role) {
    case 'input':
      return 'CANVAS_SOURCE';
    case 'transform':
      return 'CANVAS_TRANSFORM';
    case 'output':
      return 'CANVAS_SINK';
    case 'check':
      return 'CANVAS_CHECK';
    case 'control':
      return 'CANVAS_CONTROL';
  }
}

export function canConnectNodeRoles(sourceRole: CoreNodeRole, targetRole: CoreNodeRole): boolean {
  return CONNECTION_RULES[sourceRole].includes(targetRole);
}

export function resolveCanvasEdgeType(context: EdgeTypeStrategyContext): CanvasEdgeType {
  const strategy = EDGE_TYPE_STRATEGIES.find((rule) => rule.matches(context));
  return strategy?.edgeType ?? 'ref';
}
