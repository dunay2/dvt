/** Composition status is a structural projection, not PostgreSQL execution admission. */
import type {
  CanvasRelationalCompositionOperation,
  CanvasRelationalCompositionTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import {
  analyzeCanvasRelations,
  canvasSourceReferenceKey,
  type CanvasRelationalAnalysis,
  type CanvasRelationalAnalysisArgs,
} from './canvasRelationalAnalysis';
import { canvasPresentationOperationForRel } from './canvasRelationalOperationPresentation';
import { isCanvasSetOperation } from './canvasRelationalOperationChoices';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';

function compositionOperation(
  analysis: CanvasRelationalAnalysis
): CanvasRelationalCompositionOperation | null {
  const index = analysis.semantic?.index;
  let entry = index?.relations.get(index.rootId);
  while (entry != null) {
    const operation = canvasPresentationOperationForRel(entry.relation);
    if (
      isCanvasJoinOperation(operation) ||
      isCanvasSetOperation(operation) ||
      operation === 'cross_join'
    )
      return operation;
    entry = entry.inputs.length === 1 ? index!.relations.get(entry.inputs[0]!) : undefined;
  }
  return null;
}

export function projectCanvasRelationalComposition(
  analysis: CanvasRelationalAnalysis
): CanvasRelationalCompositionTruth | null {
  if (!analysis.isTransform) return null;
  const { connectedInputCount, failure } = analysis;
  if (failure != null && failure !== 'missing-semantic-authority')
    return {
      state: 'unresolved',
      connectedInputCount,
      reason: failure === 'input-identity-unavailable' ? failure : 'semantic-authority-invalid',
    };
  if (analysis.semantic == null)
    return connectedInputCount > 1
      ? { state: 'pending', connectedInputCount, pendingInputCount: connectedInputCount }
      : { state: 'single-input', connectedInputCount };
  const operation = compositionOperation(analysis);
  const canonicalOperation = operation == null ? {} : { canonicalOperation: operation };
  // Physical dependencies are counted once; the tree retains all distinct occurrences.
  const missingInputCount = new Set(
    analysis.projectedInputs
      .filter((input) => input.state === 'missing')
      .map((input) => canvasSourceReferenceKey(input.sourceRef))
  ).size;
  const pendingInputCount = analysis.projectedInputs.filter(
    (input) => input.state === 'pending'
  ).length;
  if (missingInputCount > 0)
    return { state: 'incomplete', connectedInputCount, missingInputCount, ...canonicalOperation };
  if (pendingInputCount > 0)
    return { state: 'pending', connectedInputCount, pendingInputCount, ...canonicalOperation };
  if (operation != null) return { state: 'canonical', connectedInputCount, operation };
  return connectedInputCount > 1
    ? { state: 'unresolved', connectedInputCount, reason: 'semantic-authority-invalid' }
    : { state: 'single-input', connectedInputCount };
}

export function resolveCanvasRelationalCompositionTruth(
  args: CanvasRelationalAnalysisArgs
): CanvasRelationalCompositionTruth | null {
  return projectCanvasRelationalComposition(analyzeCanvasRelations(args));
}
