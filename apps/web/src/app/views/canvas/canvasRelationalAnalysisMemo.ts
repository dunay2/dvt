/** Memoize the immutable Canvas authority inputs, excluding card layout and presentation. */
import {
  analyzeCanvasRelations,
  type CanvasRelationalAnalysis,
  type CanvasRelationalAnalysisArgs,
} from './canvasRelationalAnalysis';
import { canvasRelationalAnalysisDependencies } from './canvasRelationalAnalysisDependencies';

export function createCanvasRelationalAnalysisReader(): (
  args: CanvasRelationalAnalysisArgs
) => CanvasRelationalAnalysis {
  let previous: { dependencies: readonly unknown[]; result: CanvasRelationalAnalysis } | null =
    null;
  return (args) => {
    const dependencies = canvasRelationalAnalysisDependencies(args);
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
