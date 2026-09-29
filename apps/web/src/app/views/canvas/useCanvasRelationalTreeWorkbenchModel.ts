/** Owned concern: compose relational-tree query and guided-session state for presentation. */
import { useMemo } from 'react';
import { useCanvasRelationalSelection } from './useCanvasRelationalSelection';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

import { createCanvasRelationalAnalysisReader } from './canvasRelationalAnalysisMemo';
import { projectCanvasRelationalComposition } from './canvasRelationalCompositionTruth';
import { projectAnalyzedCanvasRelationalTree } from './canvasRelationalTreeProjection';
import {
  projectCanvasRelationalTreeCatalogue,
  projectPendingCanvasRelationalTreeCatalogue,
  projectCanvasRelationalCatalogueSelection,
} from './canvasRelationalTreeCatalogue';
import {
  projectCanvasSourceOccurrencePublication,
  unavailableCanvasRelationIds,
} from './canvasRelationalTreeWorkbenchModel';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { useCanvasRelationalTreeAuthoringSession } from './useCanvasRelationalTreeAuthoringSession';

export function canOpenCanvasRelationalTreeWorkbench(node: CanonicalNode): boolean {
  return node.pluginId === 'dvt' && node.kind === 'dvt:transform' && node.role === 'transform';
}

export function useCanvasRelationalTreeWorkbenchModel(
  args: Readonly<{
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    copy: CanvasRelationalTreeWorkbenchCopy;
    authoring?: CanvasRelationalTreeAuthoringContract;
  }>
) {
  const readAnalysis = useMemo(createCanvasRelationalAnalysisReader, []);
  const analysis = readAnalysis({ node: args.transformNode, nodes: args.nodes, edges: args.edges });
  const result = useMemo(() => projectAnalyzedCanvasRelationalTree(analysis), [analysis]);
  const projection = result.ok ? result.projection : null;
  const composition = useMemo(() => projectCanvasRelationalComposition(analysis), [analysis]);
  const { inputs } = analysis;
  const pendingAuthoring =
    args.authoring != null &&
    (composition?.state === 'pending' ||
      composition?.state === 'single-input' ||
      composition?.state === 'canonical') &&
    inputs.length >= 1;
  const session = useCanvasRelationalTreeAuthoringSession({
    enabled: pendingAuthoring,
    transformNode: args.transformNode,
    nodes: args.nodes,
    edges: args.edges,
    inputs,
    projection,
    document: analysis.semantic?.document ?? null,
    authoring: args.authoring,
  });
  const authoringAvailable =
    pendingAuthoring && args.authoring?.canEditNode === true && !session.restorationUnavailable;
  const sourceOutputFieldsByRelationId = useMemo(() => {
    return projectCanvasSourceOccurrencePublication(
      projection?.inputs ?? [],
      session.occurrences.pending,
      args.nodes,
      args.edges,
      args.transformNode.id
    );
  }, [
    args.nodes,
    args.edges,
    args.transformNode.id,
    projection?.inputs,
    session.occurrences.pending,
  ]);
  const selection = useCanvasRelationalSelection(args.transformNode.id, projection);
  const { selectedLocator, selectTreeNode } = selection;

  const catalogue = useMemo(() => {
    const base =
      projection == null
        ? composition?.state === 'pending' || pendingAuthoring
          ? projectPendingCanvasRelationalTreeCatalogue(inputs, args.nodes)
          : []
        : projectCanvasRelationalTreeCatalogue({
            inputs: projection.inputs,
            nodes: args.nodes,
            root: projection.root,
          });
    return projectCanvasRelationalCatalogueSelection({
      catalogue: base,
      authoringAvailable,
      selectedLocator,
      pending: session.occurrences.pending,
      selectedOccurrenceId: session.occurrences.selectedId,
      operations: session.staged.operations,
    });
  }, [
    args.nodes,
    composition?.state,
    inputs,
    authoringAvailable,
    projection,
    session.occurrences.pending,
    session.occurrences.selectedId,
    session.staged.operations,
    selectedLocator,
  ]);
  const unavailableMessage = session.restorationUnavailable
    ? args.copy.relationalTreeInputIdentityUnavailableMessage
    : result.ok
      ? null
      : result.failure.code === 'invalid-semantic-authority'
        ? args.copy.relationalTreeInvalidMessage
        : result.failure.code === 'input-identity-unavailable'
          ? args.copy.relationalTreeInputIdentityUnavailableMessage
          : args.copy.relationalTreeUnavailableMessage;
  const selectCatalogueItem = (item: CanvasRelationalTreeCatalogueItem): void => {
    if (!session.active && projection != null && item.treeLocator != null)
      selectTreeNode(item.treeLocator);
    else if (authoringAvailable && item.sourceNodeId != null)
      session.occurrences.add(item.sourceNodeId);
    else if (projection != null && item.treeLocator != null) selectTreeNode(item.treeLocator);
  };

  return {
    inputRevision: JSON.stringify(
      inputs.map((input) => [input.nodeId, input.fields, input.inputBindings])
    ),
    unavailableRelationIds: unavailableCanvasRelationIds(projection?.root),
    authoringAvailable,
    catalogue,
    inputs,
    pendingAuthoring,
    projection,
    sourceOutputFieldsByRelationId,
    ...selection,
    selectedRelationId: session.occurrences.selectedId ?? selection.selectedRelationId,
    selectRelation: (id: string | null) => {
      session.staged.clearSelection();
      if (session.occurrences.pending.some((item) => item.read.binding.relationId === id)) {
        session.occurrences.select(id!);
      } else {
        session.occurrences.clearSelection();
        selection.selectRelation(id);
      }
    },
    selectCatalogueItem,
    session,
    unavailableMessage,
  } as const;
}
