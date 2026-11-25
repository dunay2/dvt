/** Own the memoized catalogue projection for the current private authoring session. */
import { useMemo } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalCompositionTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeCatalogueItem } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeAuthoringSession } from './useCanvasRelationalTreeAuthoringSession';
import {
  projectCanvasRelationalTreeCatalogue,
  projectPendingCanvasRelationalTreeCatalogue,
  projectCanvasRelationalCatalogueSelection,
} from './canvasRelationalTreeCatalogue';

type CanvasRelationalTreeCatalogueArgs = Readonly<{
  projection: CanvasRelationalTreeProjection | null;
  composition: CanvasRelationalCompositionTruth | null;
  pendingAuthoring: boolean;
  inputs: Parameters<typeof projectPendingCanvasRelationalTreeCatalogue>[0];
  nodes: readonly CanonicalNode[];
  authoringAvailable: boolean;
  selectedLocator: string | null;
  occurrences: Pick<
    ReturnType<typeof useCanvasRelationalTreeAuthoringSession>['occurrences'],
    'pending' | 'selectedId'
  >;
  operations: Parameters<typeof projectCanvasRelationalCatalogueSelection>[0]['operations'];
}>;

export function useCanvasRelationalTreeCatalogue({
  projection,
  composition,
  pendingAuthoring,
  inputs,
  nodes,
  authoringAvailable,
  selectedLocator,
  occurrences,
  operations,
}: CanvasRelationalTreeCatalogueArgs): readonly CanvasRelationalTreeCatalogueItem[] {
  return useMemo(() => {
    const base =
      projection == null
        ? composition?.state === 'pending' || pendingAuthoring
          ? projectPendingCanvasRelationalTreeCatalogue(inputs, nodes)
          : []
        : projectCanvasRelationalTreeCatalogue({
            inputs: projection.inputs,
            nodes,
            root: projection.root,
          });
    return projectCanvasRelationalCatalogueSelection({
      catalogue: base,
      authoringAvailable,
      selectedLocator,
      pending: occurrences.pending,
      selectedOccurrenceId: occurrences.selectedId,
      operations,
    });
  }, [
    nodes,
    composition?.state,
    inputs,
    authoringAvailable,
    projection,
    occurrences.pending,
    occurrences.selectedId,
    operations,
    selectedLocator,
  ]);
}
