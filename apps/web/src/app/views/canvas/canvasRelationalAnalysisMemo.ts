/** Memoize the immutable Canvas authority inputs, excluding card layout and presentation. */
import {
  analyzeCanvasRelations,
  type CanvasRelationalAnalysis,
  type CanvasRelationalAnalysisArgs,
} from './canvasRelationalAnalysis';

export function createCanvasRelationalAnalysisReader(): (
  args: CanvasRelationalAnalysisArgs
) => CanvasRelationalAnalysis {
  let previous: { dependencies: readonly unknown[]; result: CanvasRelationalAnalysis } | null =
    null;
  return (args) => {
    const sourceIds = new Set(
      args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
    );
    const { id, pluginId, kind, role, metadata } = args.node;
    const dependencies = [
      id,
      pluginId,
      kind,
      role,
      metadata,
      ...[...sourceIds].sort(),
      ...args.nodes
        .filter((node) => sourceIds.has(node.id))
        .flatMap((node) => [node.id, node.kind, node.role, node.metadata]),
    ];
    if (
      previous != null &&
      dependencies.length === previous.dependencies.length &&
      dependencies.every((value, position) => Object.is(value, previous!.dependencies[position]))
    )
      return previous.result;
    const result = analyzeCanvasRelations(args);
    previous = { dependencies, result };
    return result;
  };
}
