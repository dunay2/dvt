/** Owned concern: derive displayed relational geometry and bind card movement to its layout session. */
import { useMemo } from 'react';
import { useRelationalLayout } from './relational-layout/RelationalLayoutSession';
import { useRelationalCardMovement } from './relational-layout/useRelationalCardMovement';
import {
  CANVAS_RELATIONAL_DETAIL_ZOOM,
  type CanvasRelationalSemanticContext,
} from './canvasRelationalTreeDetails';
import { useCanvasRelationalTreeDetails } from './useCanvasRelationalTreeDetails';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { SourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import { projectPendingSourceOccurrence } from './canvasRelationalTreeAuthoringProjection';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { projectCanvasStagedOperation } from './canvasStagedOperationProjection';
import { projectCanvasRelationalMovableCards } from './projectCanvasRelationalMovableCards';

export function useCanvasRelationalTreePlacement({
  root,
  semanticContext,
  sourceOutputFieldsByRelationId,
  stagedOperations,
  pendingSources,
  zoom,
  panMode,
  onManualLayout,
}: Readonly<{
  root: CanvasRelationalTreeNode | null;
  semanticContext?: CanvasRelationalSemanticContext;
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>;
  stagedOperations: readonly CanvasStagedOperation[];
  pendingSources?: SourceOccurrenceActions['pending'];
  zoom: number;
  panMode: boolean;
  onManualLayout?: () => void;
}>) {
  const detail = useCanvasRelationalTreeDetails(
    root,
    semanticContext,
    sourceOutputFieldsByRelationId,
    stagedOperations
  );
  const session = useRelationalLayout();
  const { projectLayout, expanded, toggleDetail } = session;
  const zoomRevealsDetail = Math.round(zoom * 100) >= CANVAS_RELATIONAL_DETAIL_ZOOM * 100;
  const detachedSources = useMemo(
    () => pendingSources?.map(projectPendingSourceOccurrence) ?? [],
    [pendingSources]
  );
  const detached = useMemo(
    () => [...detachedSources, ...stagedOperations.map(projectCanvasStagedOperation)],
    [detachedSources, stagedOperations]
  );
  const sizes = useMemo(() => {
    const visible = new Map(detail.sizes);
    const visit = (node: CanvasRelationalTreeNode): void => {
      if (!zoomRevealsDetail && !expanded.has(node.relationId ?? node.locator))
        visible.delete(node.locator);
      node.children.forEach((child) => visit(child.node));
    };
    if (root != null) visit(root);
    detached.forEach(visit);
    return visible;
  }, [root, detached, detail, expanded, zoomRevealsDetail]);
  const layout = useMemo(
    () => projectLayout(root, sizes, detached),
    [root, sizes, detached, projectLayout]
  );
  const movableCards = useMemo(() => projectCanvasRelationalMovableCards(layout), [layout]);
  const movement = useRelationalCardMovement(movableCards, zoom, session, onManualLayout, !panMode);
  return { layout, movement, graphs: detail.graphs, expanded, zoomRevealsDetail, toggleDetail };
}
