/** Owned concern: compose relational-tree query and guided-session state for presentation. */
import { useEffect, useMemo, useState } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasRelationalCompositionTruth } from './canvasRelationalCompositionTruth';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import {
  flattenCanvasRelationalTree,
  projectCanvasRelationalTreeCatalogue,
  projectPendingCanvasRelationalTreeCatalogue,
} from './canvasRelationalTreeWorkbenchModel';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeCatalogueItem,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { canvasRelationalAvailabilityLabel } from './DvtRelationalOperationChooser';
import { useCanvasRelationalTreeAuthoringSession } from './useCanvasRelationalTreeAuthoringSession';

export function useCanvasRelationalTreeWorkbenchModel(
  args: Readonly<{
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    copy: CanvasRelationalTreeWorkbenchCopy;
    authoring?: CanvasRelationalTreeAuthoringContract;
  }>
) {
  const result = useMemo(
    () =>
      projectCanvasRelationalTree({
        node: args.transformNode,
        nodes: args.nodes,
        edges: args.edges,
      }),
    [args.edges, args.nodes, args.transformNode]
  );
  const projection = result.ok ? result.projection : null;
  const composition = useMemo(
    () =>
      resolveCanvasRelationalCompositionTruth({
        node: args.transformNode,
        nodes: args.nodes,
        edges: args.edges,
      }),
    [args.edges, args.nodes, args.transformNode]
  );
  const inputs = useMemo(
    () =>
      resolveCanvasDvtCompositionInputs({
        targetNodeId: args.transformNode.id,
        nodes: args.nodes,
        edges: args.edges,
      }),
    [args.edges, args.nodes, args.transformNode.id]
  );
  const pendingAuthoring =
    args.authoring != null &&
    (composition?.state === 'pending' || composition?.state === 'single-input') &&
    inputs.length >= 1;
  const authoringAvailable = pendingAuthoring && args.authoring?.canEditNode === true;
  const session = useCanvasRelationalTreeAuthoringSession({
    enabled: pendingAuthoring,
    transformNode: args.transformNode,
    nodes: args.nodes,
    edges: args.edges,
    inputs,
    authoring: args.authoring,
  });
  const [selectedLocator, setSelectedLocator] = useState(projection?.root.locator ?? '');
  useEffect(() => setSelectedLocator(projection?.root.locator ?? ''), [projection?.root.locator]);

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
    if (!authoringAvailable) return base;
    const candidateById = new Map(session.candidates.map((item) => [item.nodeId, item] as const));
    return base.map((item) => {
      const candidate =
        item.sourceNodeId == null ? undefined : candidateById.get(item.sourceNodeId);
      return {
        ...item,
        selectable: session.operation == null || candidate?.selectable === true,
        selected:
          item.sourceNodeId != null &&
          (session.selectedInputIds.includes(item.sourceNodeId) ||
            session.appendInput?.nodeId === item.sourceNodeId),
        reason:
          candidate?.reason == null
            ? null
            : canvasRelationalAvailabilityLabel(candidate.reason, args.copy),
      };
    });
  }, [
    args.authoring?.canEditNode,
    args.copy,
    args.nodes,
    composition?.state,
    inputs,
    authoringAvailable,
    projection,
    session.appendInput?.nodeId,
    session.candidates,
    session.operation,
    session.selectedInputIds,
  ]);
  const selectedNode =
    projection == null
      ? null
      : (flattenCanvasRelationalTree(projection.root).find(
          (node) => node.locator === selectedLocator
        ) ?? projection.root);
  const unavailableMessage = result.ok
    ? null
    : result.failure.code === 'invalid-semantic-authority'
      ? args.copy.relationalTreeInvalidMessage
      : result.failure.code === 'input-identity-unavailable'
        ? args.copy.relationalTreeInputIdentityUnavailableMessage
        : args.copy.relationalTreeUnavailableMessage;
  const selectCatalogueItem = (item: CanvasRelationalTreeCatalogueItem): void => {
    if (authoringAvailable && item.sourceNodeId != null) session.selectInput(item.sourceNodeId);
    else if (projection != null && item.treeLocator != null) setSelectedLocator(item.treeLocator);
  };

  return {
    authoringAvailable,
    catalogue,
    inputs,
    pendingAuthoring,
    projection,
    selectedLocator,
    selectedNode,
    selectCatalogueItem,
    selectTreeNode: setSelectedLocator,
    session,
    unavailableMessage,
  } as const;
}
