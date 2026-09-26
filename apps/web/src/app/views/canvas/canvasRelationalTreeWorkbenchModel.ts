/** Owned concern: project relational-tree query results into Workbench presentation identities. */
import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalTreeInput,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeCatalogueItem } from './canvasRelationalTreeWorkbench.types';

function sourceKey(sourceRef: ConnectedSourceRef): string {
  return [
    sourceRef.connectionRef.provider,
    sourceRef.connectionRef.connectionId,
    sourceRef.sourceObjectId,
  ].join('|');
}

export function flattenCanvasRelationalTree(
  root: CanvasRelationalTreeNode
): readonly CanvasRelationalTreeNode[] {
  return [root, ...root.children.flatMap((child) => flattenCanvasRelationalTree(child.node))];
}

function sourceLabel(
  sourceNodeId: string | null,
  sourceRef: ConnectedSourceRef | null,
  nodes: readonly CanonicalNode[]
) {
  return (
    nodes.find((node) => node.id === sourceNodeId)?.name ??
    sourceRef?.sourceObjectId ??
    sourceNodeId ??
    ''
  );
}

function sourceFieldCount(
  sourceNodeId: string | null,
  nodes: readonly CanonicalNode[]
): number | null {
  const columns = nodes.find((node) => node.id === sourceNodeId)?.metadata?.columns;
  return Array.isArray(columns) ? columns.length : null;
}

function readLocatorBySource(root: CanvasRelationalTreeNode): ReadonlyMap<string, string | null> {
  const locators = new Map<string, string | null>();
  for (const node of flattenCanvasRelationalTree(root)) {
    if (node.operator !== 'read' || node.sourceRef == null) continue;
    const key = sourceKey(node.sourceRef);
    locators.set(key, locators.has(key) ? null : node.locator);
  }
  return locators;
}

export function projectCanvasRelationalTreeCatalogue(
  args: Readonly<{
    inputs: readonly CanvasRelationalTreeInput[];
    nodes: readonly CanonicalNode[];
    root: CanvasRelationalTreeNode;
  }>
): readonly CanvasRelationalTreeCatalogueItem[] {
  const locatorBySource = readLocatorBySource(args.root);
  const inputKey = (input: CanvasRelationalTreeInput): string =>
    input.sourceRef == null ? `producer:${input.sourceNodeId}` : sourceKey(input.sourceRef);
  const sources = new Map(args.inputs.map((input) => [inputKey(input), input]));
  return [...sources.values()].map((input) => ({
    key: inputKey(input),
    label: sourceLabel(input.sourceNodeId, input.sourceRef, args.nodes),
    sourceNodeId: input.sourceNodeId,
    state: input.state,
    treeLocator:
      input.sourceRef == null
        ? (flattenCanvasRelationalTree(args.root).find(
            (node) => node.relationId === input.relationId
          )?.locator ?? null)
        : (locatorBySource.get(sourceKey(input.sourceRef)) ?? null),
    fieldCount: sourceFieldCount(input.sourceNodeId, args.nodes),
  }));
}

export function projectPendingCanvasRelationalTreeCatalogue(
  inputs: readonly CanvasDvtCompositionInput[],
  nodes: readonly CanonicalNode[]
): readonly CanvasRelationalTreeCatalogueItem[] {
  return inputs.map((input) => ({
    key: input.sourceRef == null ? `producer:${input.nodeId}` : sourceKey(input.sourceRef),
    label: sourceLabel(input.nodeId, input.sourceRef, nodes),
    sourceNodeId: input.nodeId,
    state: 'pending',
    treeLocator: null,
    fieldCount: input.fields.length,
  }));
}
