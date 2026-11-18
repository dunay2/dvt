/**
 * Owned concern: define the snapshot boundary of one discardable relational editing session.
 * Reason to change: persisted hydration and private authoring inputs change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused command/query boundaries.
 * @decision Keep persisted and private snapshots explicit in the existing session contract.
 * @consequence A private producer preview cannot become the hydration baseline.
 * @version 1.0.0
 */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchProps } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';

export type CanvasRelationalTreeAnalysisSnapshot = Readonly<{
  projection: CanvasRelationalTreeProjection | null;
  document: SubstraitDocument | null;
  inputs: readonly CanvasDvtCompositionInput[];
}>;

export type CanvasRelationalTreeAuthoringSessionArgs = Readonly<
  Pick<CanvasRelationalTreeWorkbenchProps, 'transformNode' | 'nodes' | 'edges' | 'authoring'> &
    Pick<CanvasRelationalTreeAnalysisSnapshot, 'inputs'> & {
      enabled: boolean;
      state: ReturnType<typeof useCanvasRelationalTreeDraftState>;
      persisted: CanvasRelationalTreeAnalysisSnapshot;
    }
>;
