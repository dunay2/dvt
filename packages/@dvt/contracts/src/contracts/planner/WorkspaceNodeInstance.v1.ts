/**
 * Owned concern: resolve same-canvas node references without copying configuration authority.
 * @baseline ADR-0035: keep one governed authoring contract.
 * @decision Persist references; resolve metadata and path only for read consumers.
 * @consequence Shared edits propagate while invalid references fail closed.
 * @version 1.0.0
 */
import type { z } from 'zod';

import type { WorkspaceGraphAuthoringNode } from './WorkspaceGraphAuthoringDraft.v1.js';

export const WORKSPACE_NODE_INSTANCE_ERROR = {
  invalidReference: 'WORKSPACE_NODE_INSTANCE_REFERENCE_INVALID',
  configurationOverride: 'WORKSPACE_NODE_INSTANCE_CONFIGURATION_OVERRIDE',
} as const;

export class WorkspaceNodeInstanceError extends Error {
  readonly code = WORKSPACE_NODE_INSTANCE_ERROR.invalidReference;
  constructor(readonly nodeId: string) {
    super(WORKSPACE_NODE_INSTANCE_ERROR.invalidReference);
    this.name = 'WorkspaceNodeInstanceError';
  }
}

/** Read the single reference; sourceDefinitionId remains accepted for saved Source instances. */
export function workspaceNodeDefinitionId(
  node:
    | Readonly<{
        definitionId?: string | undefined;
        sourceDefinitionId?: string | undefined;
      }>
    | null
    | undefined
): string | undefined {
  return node?.definitionId ?? node?.sourceDefinitionId;
}

function resolveDefinition<T extends WorkspaceGraphAuthoringNode>(
  node: T,
  nodes: ReadonlyMap<string, T>
): T {
  const definition = nodes.get(workspaceNodeDefinitionId(node)!);
  if (
    definition == null ||
    definition === node ||
    workspaceNodeDefinitionId(definition) != null ||
    (node.definitionId != null && node.sourceDefinitionId != null) ||
    (node.role !== 'input' && node.role !== 'transform') ||
    (node.sourceDefinitionId != null && node.role !== 'input') ||
    definition.role !== node.role ||
    node.kind !== definition.kind ||
    node.pluginId !== definition.pluginId
  ) {
    throw new WorkspaceNodeInstanceError(node.id);
  }
  return definition;
}

export function resolveWorkspaceNodeInstances<T extends WorkspaceGraphAuthoringNode>(
  nodes: readonly T[]
): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.map((node) => {
    if (workspaceNodeDefinitionId(node) == null) return node;
    const definition = resolveDefinition(node, byId);
    return { ...node, metadata: definition.metadata, path: definition.path };
  });
}

/** Inherit definition input context for queries; never persist or draw these edges. */
export function projectWorkspaceNodeInstanceEdges<
  T extends Readonly<{ sourceId: string; targetId: string; id?: string }>,
>(nodes: readonly WorkspaceGraphAuthoringNode[], edges: readonly T[]): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const result = [...edges];
  const incoming = new Map<string, T[]>();
  const edgeIds = new Set(edges.flatMap((edge) => (edge.id == null ? [] : [edge.id])));
  for (const edge of edges) {
    if (!incoming.has(edge.targetId)) incoming.set(edge.targetId, []);
    incoming.get(edge.targetId)!.push(edge);
  }
  for (const node of nodes) {
    if (workspaceNodeDefinitionId(node) == null || node.role !== 'transform') continue;
    const definition = resolveDefinition(node, byId);
    if (incoming.has(node.id)) continue;
    for (const edge of incoming.get(definition.id) ?? []) {
      if (edge.id == null) result.push({ ...edge, targetId: node.id });
      else {
        const prefix = `instance_edge_${node.id}_${edge.id}`;
        let id = prefix;
        let ordinal = 2;
        while (edgeIds.has(id)) id = `${prefix}_${ordinal++}`;
        edgeIds.add(id);
        result.push({ ...edge, targetId: node.id, id });
      }
    }
  }
  return result;
}

export function validateWorkspaceNodeInstances(
  nodes: readonly WorkspaceGraphAuthoringNode[],
  ctx: z.RefinementCtx,
  prefix: (string | number)[]
): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  nodes.forEach((node, index) => {
    if (workspaceNodeDefinitionId(node) == null) return;
    try {
      resolveDefinition(node, byId);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: [
          ...prefix,
          'nodes',
          index,
          node.definitionId == null ? 'sourceDefinitionId' : 'definitionId',
        ],
        message: WORKSPACE_NODE_INSTANCE_ERROR.invalidReference,
      });
    }
    if (node.metadata !== undefined || node.path !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [...prefix, 'nodes', index],
        message: WORKSPACE_NODE_INSTANCE_ERROR.configurationOverride,
      });
    }
  });
}
