/** Own lexical SQL and revision-bound receipts independently from persisted Model semantics. */
import type {
  ModelSqlContextResponse,
  ModelSqlCompilationResponse,
  TransformSqlDraftDataSampleResponse,
} from '@dvt/contracts';
import type { ModelSqlFailure } from '../../../ports/canvasModelSql';

export type ModelSqlAction = 'context' | 'validate' | 'execute' | 'generate';
export type ModelSqlDraftState = Readonly<{
  sql: string;
  baseline: string;
  acceptedSemanticSha256: string | null;
  context: ModelSqlContextResponse | null;
  analysis: Readonly<{ sql: string; result: ModelSqlCompilationResponse }> | null;
  data: Readonly<{ sql: string; result: TransformSqlDraftDataSampleResponse }> | null;
  pending: ModelSqlAction | null;
  failure: ModelSqlFailure | null;
}>;
export const initialModelSqlDraft: ModelSqlDraftState = {
  sql: '',
  baseline: '',
  acceptedSemanticSha256: null,
  context: null,
  analysis: null,
  data: null,
  pending: null,
  failure: null,
};
type Action =
  | { type: 'text'; sql: string }
  | { type: 'context'; context: ModelSqlContextResponse }
  | { type: 'analysis'; sql: string; result: ModelSqlCompilationResponse }
  | { type: 'data'; sql: string; result: TransformSqlDraftDataSampleResponse }
  | { type: 'pending'; action: ModelSqlAction | null }
  | { type: 'failure'; reason: ModelSqlFailure }
  | { type: 'applied'; sql: string; semanticSha256: string }
  | { type: 'invalidate' | 'discard' };
export function hasModelSqlChanges(state: ModelSqlDraftState) {
  return state.sql !== state.baseline;
}
export function currentModelSqlAnalysis(state: ModelSqlDraftState) {
  return state.analysis?.sql === state.sql &&
    state.analysis.result.contextSha256 === state.context?.contextSha256
    ? state.analysis.result
    : null;
}
export function modelSqlDraftReducer(
  state: ModelSqlDraftState,
  action: Action
): ModelSqlDraftState {
  switch (action.type) {
    case 'text':
      return { ...state, sql: action.sql, failure: null };
    case 'context': {
      const accepted =
        state.acceptedSemanticSha256 != null &&
        state.acceptedSemanticSha256 === action.context.semanticPlanSha256;
      const baseline = accepted ? state.baseline : (action.context.sql ?? '');
      return {
        ...state,
        context: action.context,
        failure: null,
        baseline,
        acceptedSemanticSha256: accepted ? state.acceptedSemanticSha256 : null,
        ...(!hasModelSqlChanges(state) ? { sql: baseline } : {}),
      };
    }
    case 'analysis':
      return { ...state, analysis: { sql: action.sql, result: action.result } };
    case 'data':
      return { ...state, data: { sql: action.sql, result: action.result } };
    case 'pending':
      return { ...state, pending: action.action, failure: null };
    case 'failure':
      return {
        ...state,
        failure: action.reason,
        pending: null,
        ...(action.reason === 'stale' ? { context: null } : {}),
      };
    case 'applied':
      return { ...state, baseline: action.sql, acceptedSemanticSha256: action.semanticSha256 };
    case 'invalidate':
      return { ...state, context: null, pending: null };
    case 'discard':
      return { ...state, sql: state.baseline, analysis: null, pending: null, failure: null };
  }
}
