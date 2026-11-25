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

import { useCanvasRelationalTreeAnalysis } from './useCanvasRelationalTreeAnalysis';
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
import { useCanvasModelCompositionDrop } from './useCanvasModelCompositionDrop';
import { getPluginPortMap } from '../../plugins/registry';
import { useCanvasModelBrowserPresentation } from './CanvasModelBrowser';
import {
  discoverCanvasDbtModels,
  guardDiscoveredDbtCompositionApply,
} from './canvasDbtModelCompositionDiscovery';

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
  const browser = useCanvasModelBrowserPresentation();
  const publication = browser?.fileModels;
  const discoveries = useMemo(
    () => discoverCanvasDbtModels(publication?.projection, inputArgs.nodes),
    [publication?.projection, inputArgs.nodes]
  );
  const authoring = useMemo(
    () => guardDiscoveredDbtCompositionApply(inputArgs.authoring, publication?.refresh),
    [inputArgs.authoring, publication?.refresh]
  );
  const query = useCanvasRelationalTreeAnalysis({ ...inputArgs, copies: state.modelCopies });
  const { graph, analysis, result, projection, composition, outputPlanRelationIds } = query;
  const args = { ...inputArgs, ...graph, authoring };
  const pluginPorts = useMemo(() => getPluginPortMap(), []);
  const pendingAuthoring =
    args.authoring != null &&
    canAuthorCanvasRelationalTree(analysis, projection, composition, args.transformNode);
  const session = useCanvasRelationalTreeAuthoringSession({
    state,
    persisted: query.persisted,
    enabled: pendingAuthoring,
    transformNode: args.transformNode,
    nodes: args.nodes,
    edges: args.edges,
    inputs: analysis.inputs,
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
    discoveries,
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
    const locator = projection == null ? null : item.treeLocator;
    if (!session.active && locator != null) selectTreeNode(locator);
    else if (authoringAvailable && item.sourceNodeId != null)
      session.occurrences.add(item.sourceNodeId);
    else if (locator != null) selectTreeNode(locator);
  };

  return {
    ...graph,
    layoutDocument: query.persisted.document,
    modelComposition,
    inputRevision: query.inputRevisionFor(sourceInputRecovery.inputs),
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
