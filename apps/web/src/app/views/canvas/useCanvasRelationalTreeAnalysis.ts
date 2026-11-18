/**
 * Owned concern: consume persisted and private graph queries for the relational Workbench.
 * Reason to change: Workbench snapshot projection and analysis reuse change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused command/query boundaries.
 * @decision Reuse the persisted reader whenever no private producer changes the graph.
 * @consequence Query previews remain independent of the session hydration baseline.
 * @version 1.0.0
 */
import { useMemo } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasModelCompositionCopy } from './canvasModelCompositionCandidate';
import { projectCanvasModelCopies } from './canvasModelCompositionCandidate';
import { createCanvasRelationalAnalysisReader } from './canvasRelationalAnalysisMemo';
import { projectCanvasRelationalComposition } from './canvasRelationalCompositionTruth';
import { projectAnalyzedCanvasRelationalTree } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeAnalysisSnapshot } from './canvasRelationalTreeSession.types';
import type { CanvasRelationalTreeWorkbenchProps } from './canvasRelationalTreeWorkbench.types';

export function useCanvasRelationalTreeAnalysis(
  args: Readonly<
    Pick<CanvasRelationalTreeWorkbenchProps, 'transformNode' | 'nodes' | 'edges'> & {
      copies: readonly CanvasModelCompositionCopy[];
    }
  >
) {
  const graph = useMemo(
    () => projectCanvasModelCopies({ nodes: args.nodes, edges: args.edges, copies: args.copies }),
    [args.nodes, args.edges, args.copies]
  );
  const readPersisted = useMemo(createCanvasRelationalAnalysisReader, []);
  const readPrivate = useMemo(createCanvasRelationalAnalysisReader, []);
  const persistedAnalysis = readPersisted({
    node: args.transformNode,
    nodes: args.nodes,
    edges: args.edges,
  });
  const persisted = useMemo((): CanvasRelationalTreeAnalysisSnapshot => {
    const result = projectAnalyzedCanvasRelationalTree(persistedAnalysis);
    return {
      projection: result.ok ? result.projection : null,
      document: persistedAnalysis.semantic?.document ?? null,
      inputs: persistedAnalysis.inputs,
    };
  }, [persistedAnalysis]);
  const analysis =
    graph.nodes === args.nodes && graph.edges === args.edges
      ? persistedAnalysis
      : readPrivate({ node: args.transformNode, ...graph });
  const result = useMemo(() => projectAnalyzedCanvasRelationalTree(analysis), [analysis]);
  const composition = useMemo(() => projectCanvasRelationalComposition(analysis), [analysis]);
  const outputPlanRelationIds = useMemo(
    () => new Set(analysis.semantic?.index.relations.keys()),
    [analysis.semantic]
  );
  return {
    graph,
    persisted,
    analysis,
    result,
    composition,
    outputPlanRelationIds,
    projection: result.ok ? result.projection : null,
    inputRevisionFor: (inputs: readonly CanvasDvtCompositionInput[]): string =>
      JSON.stringify(
        inputs
          .filter(({ nodeId }) =>
            analysis.projectedInputs.some(
              (read) => read.sourceNodeId === nodeId && read.relationId != null
            )
          )
          .map((input) => [input.nodeId, input.fields, input.inputBindings])
      ),
  };
}
