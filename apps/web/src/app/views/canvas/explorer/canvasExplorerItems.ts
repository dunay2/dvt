/**
 * Owned concern: project existing graph identities into navigation rows.
 * @baseline GH-3610: sources, occurrences and operations are distinct identities.
 * @decision Read the active context's projection; never hydrate or author from navigation.
 * @consequence Repeated labels stay selectable without creating duplicate nodes.
 * @version 1.0.0
 */
import type { Node } from '@xyflow/react';
import type { CanonicalNode } from '../../../types/canonical';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import type { PendingSourceOccurrence } from '../relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasStagedOperation } from '../canvasStagedOperation';
import { flattenCanvasRelationalTree } from '../canvasRelationalTreeWorkbenchModel';
import { resolveCanvasRelationalNodeCopy } from '../canvasRelationalNodePresentation';
import { resolveCanvasRelationalOperationPresentation } from '../canvasRelationalOperationPresentation';

export type CanvasExplorerItem = Readonly<{
  id: string;
  label: string;
  description?: string;
  selected?: boolean;
}>;

export function projectCanvasExplorerSources(
  catalogue: readonly CanonicalNode[]
): CanvasExplorerItem[] {
  const items: CanvasExplorerItem[] = [];
  for (const node of catalogue) {
    if (node.role !== 'input' || node.sourceDefinitionId != null) continue;
    const context = [node.metadata?.schema, node.metadata?.connectionName]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
      .join(' · ');
    items.push({ id: node.id, label: node.name, description: context || undefined });
  }
  return items;
}

export function projectCanvasExplorerNodes(nodes: readonly Node[]) {
  return nodes.map((node) => ({
    id: node.id,
    label: typeof node.data.name === 'string' ? node.data.name : node.id,
    description: typeof node.data.pluginKind === 'string' ? node.data.pluginKind : node.id,
    source: node.data.role === 'input',
    selected: node.selected === true,
  }));
}

export function projectRelationalExplorerItems(
  input: Readonly<{
    draft: boolean;
    root: CanvasRelationalTreeNode | null;
    sources: readonly PendingSourceOccurrence[];
    operations: readonly CanvasStagedOperation[];
    selectedId: string | null;
    copy: CanvasRelationalTreeWorkbenchCopy;
  }>
) {
  const rows = input.draft
    ? [
        ...input.sources.map((source) => ({
          id: source.read.binding.relationId,
          label: source.read.binding.displayName,
        })),
        ...input.operations.map((operation) => ({
          id: operation.id,
          label:
            input.copy[resolveCanvasRelationalOperationPresentation(operation.operation).labelKey],
        })),
      ]
    : (input.root == null ? [] : flattenCanvasRelationalTree(input.root)).flatMap((node) =>
        node.relationId == null
          ? []
          : [
              {
                id: node.relationId,
                label: resolveCanvasRelationalNodeCopy(node, input.copy).title,
              },
            ]
      );
  return rows.map((row) => ({
    ...row,
    description: row.id,
    selected: row.id === input.selectedId,
  }));
}
