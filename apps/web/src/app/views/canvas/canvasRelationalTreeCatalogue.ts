/** Project source catalogue labels, availability and selection without React state. */
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  isDvtSourceOutputProjectionNode,
  readDvtSourceOutputProjection,
} from './canvasDvtSourceSemanticAuthoring';
import type {
  CanvasRelationalTreeInput,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeCatalogueItem } from './canvasRelationalTreeWorkbench.types';
import { flattenCanvasRelationalTree } from './canvasRelationalTreeWorkbenchModel';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';

function sourceKey(sourceRef: ConnectedSourceRef): string {
  return [
    sourceRef.connectionRef.provider,
    sourceRef.connectionRef.connectionId,
    sourceRef.sourceObjectId,
  ].join('|');
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

export function projectCanvasRelationalCatalogueSelection(
  args: Readonly<{
    catalogue: readonly CanvasRelationalTreeCatalogueItem[];
    authoringAvailable: boolean;
    selectedLocator: string | null;
    pending: readonly PendingSourceOccurrence[];
    selectedOccurrenceId: string | null;
    operations: readonly CanvasStagedOperation[];
  }>
): readonly CanvasRelationalTreeCatalogueItem[] {
  if (!args.authoringAvailable) {
    return args.catalogue.map((item) => ({
      ...item,
      selected: item.treeLocator != null && item.treeLocator === args.selectedLocator,
    }));
  }
  const configuredProducerIds = new Set(
    args.operations.flatMap((operation) =>
      operation.semanticDocument == null
        ? []
        : operation.inputs.filter((input): input is string => input != null)
    )
  );
  return args.catalogue.map((item) => {
    const occurrences = args.pending.filter(
      (occurrence) => occurrence.sourceNodeId === item.sourceNodeId
    );
    return {
      ...item,
      state:
        item.sourceNodeId != null &&
        occurrences.some((occurrence) =>
          configuredProducerIds.has(occurrence.read.binding.relationId)
        )
          ? 'participating'
          : item.state,
      selectable: item.fieldCount !== 0,
      selected: occurrences.some(
        (occurrence) => occurrence.read.binding.relationId === args.selectedOccurrenceId
      ),
      reason: null,
    };
  });
}
