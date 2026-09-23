/** Project the shared canonical analysis into the existing Canvas tree read model. */
import type { ConnectedSourceRef } from '@dvt/contracts';
import {
  analyzeCanvasRelations,
  type CanvasRelationalAnalysis,
  type CanvasRelationalAnalysisArgs,
} from './canvasRelationalAnalysis';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import type { CanvasPresentationOperation } from './canvasRelationalOperationPresentation';

export type CanvasRelationalTreeOperator =
  | 'read'
  | 'project'
  | 'filter'
  | 'join'
  | 'cross'
  | 'set'
  | 'aggregate'
  | 'sort'
  | 'fetch'
  | 'unsupported';

export type CanvasRelationalTreeChildRole = 'input' | 'left' | 'right' | 'primary' | 'secondary';

export type CanvasRelationalTreeField = Readonly<{
  fieldId: string;
  outputOrdinal: number;
  displayName: string | null;
  sourceFieldId: string | null;
  operandFieldIds: readonly string[];
}>;

export type CanvasRelationalTreeExpressionRef = Readonly<{
  slot:
    | 'filter-condition'
    | 'join-condition'
    | 'project-expression'
    | 'aggregate-expression'
    | 'sort-key';
  ordinal: number;
}>;

export type CanvasRelationalTreeNode = Readonly<{
  locator: string;
  operator: CanvasRelationalTreeOperator;
  substraitKind: string;
  operation?: CanvasPresentationOperation;
  relationId: string | null;
  displayName: string | null;
  sourceRef: ConnectedSourceRef | null;
  output: Readonly<{ fields: readonly CanvasRelationalTreeField[] }>;
  expressionRefs: readonly CanvasRelationalTreeExpressionRef[];
  decorations: readonly Readonly<{ kind: 'window'; count: number }>[];
  children: readonly Readonly<{
    role: CanvasRelationalTreeChildRole;
    ordinal: number;
    node: CanvasRelationalTreeNode;
  }>[];
}>;

export type CanvasRelationalTreeInput = Readonly<{
  sourceRef: ConnectedSourceRef;
  sourceNodeId: string | null;
  relationId: string | null;
  state: 'participating' | 'pending' | 'missing';
}>;

export type CanvasRelationalTreeProjection = Readonly<{
  transformNodeId: string;
  semanticDigest: string;
  root: CanvasRelationalTreeNode;
  output: CanvasRelationalTreeNode['output'];
  inputs: readonly CanvasRelationalTreeInput[];
}>;

export type CanvasRelationalTreeProjectionResult =
  | Readonly<{ ok: true; projection: CanvasRelationalTreeProjection }>
  | Readonly<{
      ok: false;
      failure: Readonly<{
        code:
          | 'missing-semantic-authority'
          | 'invalid-semantic-authority'
          | 'input-identity-unavailable';
      }>;
    }>;

export function projectAnalyzedCanvasRelationalTree(
  analysis: CanvasRelationalAnalysis
): CanvasRelationalTreeProjectionResult {
  if (analysis.failure != null) return { ok: false, failure: { code: analysis.failure } };
  if (analysis.semantic == null)
    return { ok: false, failure: { code: 'missing-semantic-authority' } };
  try {
    const root = buildCanvasRelationalTreeRelation(analysis.semantic);
    return {
      ok: true,
      projection: {
        transformNodeId: analysis.transformNodeId,
        semanticDigest: analysis.semantic.digest,
        root,
        output: root.output,
        inputs: analysis.projectedInputs,
      },
    };
  } catch {
    return { ok: false, failure: { code: 'invalid-semantic-authority' } };
  }
}

export function projectCanvasRelationalTree(
  args: CanvasRelationalAnalysisArgs
): CanvasRelationalTreeProjectionResult {
  return projectAnalyzedCanvasRelationalTree(analyzeCanvasRelations(args));
}
