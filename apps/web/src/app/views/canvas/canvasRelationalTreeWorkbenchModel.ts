/** Owned concern: project relational-tree query results into Workbench presentation identities. */
import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalTreeInput,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeCatalogueItem } from './canvasRelationalTreeWorkbench.types';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import {
  isDvtSourceOutputProjectionNode,
  readDvtSourceOutputProjection,
} from './canvasDvtSourceSemanticAuthoring';

export function projectCanvasSourceOccurrencePublication(
  inputs: readonly CanvasRelationalTreeInput[],
  pending: readonly PendingSourceOccurrence[],
  nodes: readonly CanonicalNode[],
  edges?: readonly CanvasInputBindingEdge[],
  targetNodeId?: string
): ReadonlyMap<string, readonly string[]> {
  const fields = new Map<string, readonly string[]>();
  const publicationFor = (sourceNodeId: string | null): readonly string[] | null => {
    const producer = nodes.find((node) => node.id === sourceNodeId);
    if (producer == null) return null;
    try {
      const edge = edges?.find(
        (candidate) => candidate.sourceId === producer.id && candidate.targetId === targetNodeId
      );
      if (edges != null && edge == null) return [];
      const selected = edge == null ? undefined : readCanvasInputBindings(edge);
      return (
        readDvtSourceOutputProjection(producer)
          ?.outputs.filter(
            (field) =>
              selected == null ||
              selected.fields.some((binding) => binding.producerFieldId === field.sourceFieldName)
          )
          .map((output) => output.sourceFieldName!) ?? null
      );
    } catch {
      return null;
    }
  };
  for (const input of inputs) {
    if (input.relationId == null) continue;
    const publication = publicationFor(input.sourceNodeId);
    if (publication != null) fields.set(input.relationId, publication);
  }
  for (const occurrence of pending) {
    const publication = publicationFor(occurrence.sourceNodeId);
    if (publication != null) fields.set(occurrence.read.binding.relationId, publication);
  }
  return fields;
}

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
  const node = nodes.find((candidate) => candidate.id === sourceNodeId);
  if (node == null) return null;
  if (isDvtSourceOutputProjectionNode(node)) {
    try {
      return readDvtSourceOutputProjection(node)?.outputs.length ?? 0;
    } catch {
      return 0;
    }
  }
  const columns = node.metadata?.columns;
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
    fieldCount: sourceFieldCount(input.nodeId, nodes) ?? input.fields.length,
  }));
}
