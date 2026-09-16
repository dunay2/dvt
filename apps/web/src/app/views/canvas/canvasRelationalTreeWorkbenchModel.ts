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
  sourceRef: ConnectedSourceRef,
  nodes: readonly CanonicalNode[]
) {
  return nodes.find((node) => node.id === sourceNodeId)?.name ?? sourceRef.sourceObjectId;
}

function readLocatorBySource(root: CanvasRelationalTreeNode): ReadonlyMap<string, string> {
  return new Map(
    flattenCanvasRelationalTree(root).flatMap((node) =>
      node.operator === 'read' && node.sourceRef != null
        ? [[sourceKey(node.sourceRef), node.locator] as const]
        : []
    )
  );
}

export function projectCanvasRelationalTreeCatalogue(
  args: Readonly<{
    inputs: readonly CanvasRelationalTreeInput[];
    nodes: readonly CanonicalNode[];
    root: CanvasRelationalTreeNode;
  }>
): readonly CanvasRelationalTreeCatalogueItem[] {
  const locatorBySource = readLocatorBySource(args.root);
  return args.inputs.map((input) => ({
    key: sourceKey(input.sourceRef),
    label: sourceLabel(input.sourceNodeId, input.sourceRef, args.nodes),
    sourceNodeId: input.sourceNodeId,
    state: input.state,
    treeLocator: locatorBySource.get(sourceKey(input.sourceRef)) ?? null,
  }));
}

export function projectPendingCanvasRelationalTreeCatalogue(
  inputs: readonly CanvasDvtCompositionInput[],
  nodes: readonly CanonicalNode[]
): readonly CanvasRelationalTreeCatalogueItem[] {
  return inputs.map((input) => ({
    key: sourceKey(input.sourceRef),
    label: sourceLabel(input.nodeId, input.sourceRef, nodes),
    sourceNodeId: input.nodeId,
    state: 'pending',
    treeLocator: null,
  }));
}
