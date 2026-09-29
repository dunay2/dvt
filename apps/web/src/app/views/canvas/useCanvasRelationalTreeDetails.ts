/** Memoize the local semantic card projection independently of layout gestures. */
import { useMemo } from 'react';
import {
  projectCanvasRelationalTreeDetails,
  type CanvasRelationalSemanticContext,
} from './canvasRelationalTreeDetails';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasStagedOperation } from './canvasStagedOperation';

export function useCanvasRelationalTreeDetails(
  root: CanvasRelationalTreeNode | null,
  context: CanvasRelationalSemanticContext | undefined,
  sourceOutputFieldsByRelationId: ReadonlyMap<string, readonly string[]> | undefined,
  stagedOperations: readonly CanvasStagedOperation[]
) {
  return useMemo(
    () =>
      projectCanvasRelationalTreeDetails(
        root,
        context,
        sourceOutputFieldsByRelationId,
        stagedOperations
      ),
    [root, context?.transformNode, context?.draft, sourceOutputFieldsByRelationId, stagedOperations]
  );
}
