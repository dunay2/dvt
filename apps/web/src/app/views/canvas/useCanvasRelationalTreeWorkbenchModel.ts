/**
 * Owned concern: compose relational queries, stable selection and discardable authoring state.
 * @baseline ADR-0064: accepted relation identities survive draft persistence.
 * @decision Distinguish navigation from retaining selection across Apply acknowledgements.
 * @consequence Saving cannot clear the still-visible pending editor or lose its applied selection.
 * @version 1.1.0
 */
import { useMemo } from 'react';
import { readWorkspaceDbtModelReference } from '@dvt/contracts';
import { useCanvasRelationalSelection } from './useCanvasRelationalSelection';

import type { CanonicalNode } from '../../types/canonical';

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
  canAuthorCanvasRelationalTree,
} from './canvasRelationalTreeWorkbenchModel';
import type {
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchProps,
} from './canvasRelationalTreeWorkbench.types';
import { useCanvasRelationalTreeAuthoringSession } from './useCanvasRelationalTreeAuthoringSession';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { projectCanvasModelCopies } from './canvasModelCompositionCandidate';
import { useCanvasModelCompositionDrop } from './useCanvasModelCompositionDrop';
import { getPluginPortMap } from '../../plugins/registry';

export function canOpenCanvasRelationalTreeWorkbench(node: CanonicalNode): boolean {
  return (
    node.pluginId === 'dvt' &&
    node.kind === 'dvt:transform' &&
    node.role === 'transform' &&
    readWorkspaceDbtModelReference(node) == null
  );
}

export function useCanvasRelationalTreeWorkbenchModel(
  inputArgs: Pick<
    CanvasRelationalTreeWorkbenchProps,
    'transformNode' | 'nodes' | 'edges' | 'copy' | 'authoring'
  >
) {
  const state = useCanvasRelationalTreeDraftState();
  const graph = useMemo(
    () =>
      projectCanvasModelCopies({
        nodes: inputArgs.nodes,
        edges: inputArgs.edges,
        copies: state.modelCopies,
      }),
    [inputArgs.nodes, inputArgs.edges, state.modelCopies]
  );
  const args = { ...inputArgs, ...graph };
  const pluginPorts = useMemo(() => getPluginPortMap(), []);
  const readPersistedAnalysis = useMemo(createCanvasRelationalAnalysisReader, []);
  const persistedAnalysis = readPersistedAnalysis({
    node: inputArgs.transformNode,
    nodes: inputArgs.nodes,
    edges: inputArgs.edges,
  });
  const persistedResult = useMemo(
    () => projectAnalyzedCanvasRelationalTree(persistedAnalysis),
    [persistedAnalysis]
  );
  const readAnalysis = useMemo(createCanvasRelationalAnalysisReader, []);
  const analysis =
    graph.nodes === inputArgs.nodes && graph.edges === inputArgs.edges
      ? persistedAnalysis
      : readAnalysis({ node: args.transformNode, nodes: args.nodes, edges: args.edges });
  const result = useMemo(() => projectAnalyzedCanvasRelationalTree(analysis), [analysis]);
  const projection = result.ok ? result.projection : null;
  const outputPlanRelationIds = useMemo(
    () => new Set(analysis.semantic?.index.relations.keys()),
    [analysis.semantic]
  );
  const composition = useMemo(() => projectCanvasRelationalComposition(analysis), [analysis]);
  const { inputs, projectedInputs } = analysis;
  const pendingAuthoring =
    args.authoring != null &&
    canAuthorCanvasRelationalTree(analysis, projection, composition, args.transformNode);
  const session = useCanvasRelationalTreeAuthoringSession({
    state,
    persisted: {
      projection: persistedResult.ok ? persistedResult.projection : null,
      document: persistedAnalysis.semantic?.document ?? null,
      inputs: persistedAnalysis.inputs,
    },
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
  const modelComposition = useCanvasModelCompositionDrop({
    ...graph,
    targetId: args.transformNode.id,
    enabled: authoringAvailable,
    pluginPorts,
    state,
    start: session.start,
    analysis: session.analysis,
  });
  const { sourceInputRecovery } = session;
  const sourceOutputFieldsByRelationId = useMemo(
    () =>
      projectCanvasSourceOccurrencePublication(
        projection?.inputs ?? [],
        session.occurrences.pending,
        args.nodes,
        sourceInputRecovery.edges,
        args.transformNode.id
      ),
    [
      args.nodes,
      sourceInputRecovery.edges,
      args.transformNode.id,
      projection?.inputs,
      session.occurrences.pending,
    ]
  );
  const selection = useCanvasRelationalSelection(args.transformNode.id, projection);
  const { selectedLocator, selectTreeNode } = selection;

  const catalogue = useMemo(() => {
    const base =
      projection == null
        ? composition?.state === 'pending' || pendingAuthoring
          ? projectPendingCanvasRelationalTreeCatalogue(sourceInputRecovery.inputs, args.nodes)
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
    sourceInputRecovery.inputs,
    authoringAvailable,
    projection,
    session.occurrences.pending,
    session.occurrences.selectedId,
    session.staged.operations,
    selectedLocator,
  ]);
  const unavailableMessage =
    analysis.semantic?.state === 'retained'
      ? args.copy.relationalTreeProducerFieldsUnavailableMessage
      : session.restorationUnavailable
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
    ...graph,
    modelComposition,
    inputRevision: JSON.stringify(
      sourceInputRecovery.inputs
        .filter(({ nodeId }) =>
          projectedInputs.some((read) => read.sourceNodeId === nodeId && read.relationId != null)
        )
        .map((input) => [input.nodeId, input.fields, input.inputBindings])
    ),
    unavailableRelationIds: unavailableCanvasRelationIds(projection?.root),
    connectedModelRelationIds: analysis.connectedModelRelationIds,
    outputPlanRelationIds,
    authoringAvailable,
    catalogue,
    inputs: sourceInputRecovery.inputs,
    pendingAuthoring,
    projection,
    sourceOutputFieldsByRelationId,
    ...selection,
    retainAppliedSelection: selection.selectRelation,
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
