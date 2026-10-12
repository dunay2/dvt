/**
 * Owned concern: resolve same-canvas source references without copying configuration authority.
 * @baseline ADR-0035: keep one governed authoring contract.
 * @decision Persist references; resolve metadata and path only for read consumers.
 * @consequence Shared edits propagate while invalid references fail closed.
 * @version 1.0.0
 */
import type { z } from 'zod';

import type { WorkspaceGraphAuthoringNode } from './WorkspaceGraphAuthoringDraft.v1.js';

export const WORKSPACE_SOURCE_INSTANCE_ERROR = {
  invalidReference: 'WORKSPACE_SOURCE_INSTANCE_REFERENCE_INVALID',
  configurationOverride: 'WORKSPACE_SOURCE_INSTANCE_CONFIGURATION_OVERRIDE',
} as const;

export class WorkspaceSourceInstanceError extends Error {
  readonly code = WORKSPACE_SOURCE_INSTANCE_ERROR.invalidReference;
  constructor(readonly nodeId: string) {
    super(WORKSPACE_SOURCE_INSTANCE_ERROR.invalidReference);
    this.name = 'WorkspaceSourceInstanceError';
  }
}

function resolveDefinition<T extends WorkspaceGraphAuthoringNode>(
  node: T,
  nodes: ReadonlyMap<string, T>
): T {
  const definition = nodes.get(node.sourceDefinitionId!);
  if (
    definition == null ||
    definition === node ||
    definition.sourceDefinitionId != null ||
    node.role !== 'input' ||
    definition.role !== 'input' ||
    node.kind !== definition.kind ||
    node.pluginId !== definition.pluginId
  ) {
    throw new WorkspaceSourceInstanceError(node.id);
  }
  return definition;
}

export function resolveWorkspaceSourceInstances<T extends WorkspaceGraphAuthoringNode>(
  nodes: readonly T[]
): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.map((node) => {
    if (node.sourceDefinitionId == null) return node;
    const definition = resolveDefinition(node, byId);
    return { ...node, metadata: definition.metadata, path: definition.path };
  });
}

export function validateWorkspaceSourceInstances(
  nodes: readonly WorkspaceGraphAuthoringNode[],
  ctx: z.RefinementCtx,
  prefix: (string | number)[]
): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  nodes.forEach((node, index) => {
    if (node.sourceDefinitionId == null) return;
    try {
      resolveDefinition(node, byId);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: [...prefix, 'nodes', index, 'sourceDefinitionId'],
        message: WORKSPACE_SOURCE_INSTANCE_ERROR.invalidReference,
      });
    }
    if (node.metadata !== undefined || node.path !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [...prefix, 'nodes', index],
        message: WORKSPACE_SOURCE_INSTANCE_ERROR.configurationOverride,
      });
    }
  });
}
