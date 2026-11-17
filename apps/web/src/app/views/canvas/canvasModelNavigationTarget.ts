/**
 * Owned concern: resolve a shared Model catalog identity to an existing editor context.
 * @baseline ADR-0069: resource identity and placement identity retain their existing contracts.
 * @decision Reuse the current matching occurrence or the unique one; expose ambiguity explicitly.
 * @consequence Model navigation allocates no occurrence and cannot silently open another context.
 * @version 1.0.0
 */
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';

export type CanvasModelNavigationContext = Readonly<{ nodeId: string; label: string }>;
export type CanvasModelNavigationTarget =
  | Readonly<{ kind: 'model'; nodeId: string }>
  | Readonly<{ kind: 'contexts'; contexts: readonly CanvasModelNavigationContext[] }>;

export function resolveCanvasModelNavigationTarget(
  definitionId: string,
  nodes: readonly CanonicalNode[],
  selectedId?: string
): CanvasModelNavigationTarget {
  const contexts = nodes.filter((node) => workspaceNodeDefinitionId(node) === definitionId);
  const selected = contexts.find((node) => node.id === selectedId);
  if (selected != null || contexts.length === 1)
    return { kind: 'model', nodeId: (selected ?? contexts[0]!).id };
  if (contexts.length === 0) return { kind: 'model', nodeId: definitionId };
  return {
    kind: 'contexts',
    contexts: contexts.map((node) => ({ nodeId: node.id, label: node.name })),
  };
}
