/**
 * Owned concern: resolve a shared Model catalog identity to an existing editor context.
 * @baseline ADR-0069: resource identity and placement identity retain their existing contracts.
 * @decision Reuse the current matching occurrence or the unique one; expose ambiguity explicitly.
 * @consequence Model navigation allocates no occurrence and cannot silently open another context.
 * @version 1.0.0
 */
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasInspectorResource,
  CanvasInspectorRequest,
} from '../../stores/canvasInspectorTarget';
import type { CanvasExplorerItem } from './explorer/canvasExplorerItems';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';
import {
  canvasExplorerSearchText,
  normalizeCanvasExplorerQuery,
} from './explorer/canvasExplorerSearch';

export type CanvasModelNavigationContext = Readonly<{ nodeId: string; label: string }>;
export type CanvasModelNavigationTarget =
  | Readonly<{ kind: 'model'; nodeId: string }>
  | Readonly<{ kind: 'contexts'; contexts: readonly CanvasModelNavigationContext[] }>;

export function resolveCanvasModelViewEntry({
  view,
  nodes,
  catalogue,
  modelIds,
  activeEditorId,
  inspected,
  selectedId,
  rememberedId,
  query,
  sourceLabel,
}: Readonly<{
  view: CanvasModelView;
  nodes: readonly CanonicalNode[];
  catalogue: readonly CanvasExplorerItem[];
  modelIds: ReadonlySet<string>;
  activeEditorId?: string;
  inspected?: CanvasInspectorResource | null;
  selectedId?: string;
  rememberedId?: string;
  query: string;
  sourceLabel: string;
}>): CanvasInspectorRequest | undefined {
  if (activeEditorId === selectedId && selectedId != null) return selectedId;
  if (view === 'sql' && inspected?.kind === 'dbt-file-model') return inspected;
  if (
    inspected?.kind === 'canonical-node' &&
    (view === 'semantic'
      ? modelIds.has(inspected.nodeId)
      : nodes.some((node) => node.id === inspected.nodeId))
  ) {
    return inspected;
  }
  if (selectedId != null) return selectedId;
  if (rememberedId != null && modelIds.has(rememberedId)) return rememberedId;
  const search = normalizeCanvasExplorerQuery(query);
  return catalogue.find(
    (item) =>
      modelIds.has(item.id) &&
      (!search || canvasExplorerSearchText(item, sourceLabel).includes(search))
  )?.id;
}

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
