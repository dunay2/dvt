/** Owned concern: distinguish an unused native placeholder from an authored or shared Model. */
import { workspaceNodeDefinitionId } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession.types';
import {
  readCanvasModelDefinitions,
  hasCanvasModelDefinitionUses,
} from './canvasModelDefinitionUsage';

function isEmptyConfig(value: unknown): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

function hasModelAuthoringContent(node: CanonicalNode): boolean {
  if (node.description?.trim()) return true;
  if (node.tags.some((tag) => tag !== 'authoring')) return true;
  return node.lastDuration != null || node.lastCost != null;
}

export function isEmptyCanvasModelDefinition(node: CanonicalNode): boolean {
  const nativeModel =
    node.pluginId === 'dvt' && node.kind === 'dvt:transform' && node.role === 'transform';
  if (!nativeModel) return false;
  if (workspaceNodeDefinitionId(node) != null) return false;
  if (node.path != null) return false;
  if (hasModelAuthoringContent(node)) return false;
  return hasOnlyPlaceholderMetadata(node);
}

export function canRemoveEmptyCanvasModel(session: CanvasDraftSession, id: string): boolean {
  const nodes = readCanvasModelDefinitions(session).filter(
    (node) => !session.removedDefinitionIds?.includes(node.id)
  );
  const candidate = nodes.find((node) => node.id === id);
  if (candidate == null || !isEmptyCanvasModelDefinition(candidate)) return false;
  return !hasCanvasModelDefinitionUses(session, nodes, id);
}

function hasOnlyPlaceholderMetadata(node: CanonicalNode): boolean {
  return Object.entries(node.metadata ?? {}).every(([key, value]) =>
    key === 'typeLabel' ? typeof value === 'string' : key === 'config' && isEmptyConfig(value)
  );
}
