import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
/** Sort and Fetch supply their Substrait messages; selection and mutation are shared. */
import { create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  RelSchema,
  SortFieldSchema,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import {
  cloneLocalRelation,
  SubstraitAnalysisError,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  prepareSelectedRelationUnary,
  commitSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';

export type SelectedSortFetchRequest = SelectedUnaryRequest &
  (
    | Readonly<{ operation: 'sort'; keys: readonly DvtSubstraitSortKey[] }>
    | Readonly<{ operation: 'fetch'; offset?: bigint | null; count?: bigint | null }>
  );

export const selectedSortDirections: ReadonlySet<number> = new Set([
  SortField_SortDirection.ASC_NULLS_FIRST,
  SortField_SortDirection.ASC_NULLS_LAST,
  SortField_SortDirection.DESC_NULLS_FIRST,
  SortField_SortDirection.DESC_NULLS_LAST,
]);

function i64Literal(value: bigint | null | undefined) {
  if (value == null) return undefined;
  if (typeof value !== 'bigint' || value < 0n || value > 9_223_372_036_854_775_807n)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Fetch requires non-negative signed i64 values.'
    );
  return create(ExpressionSchema, {
    rexType: { case: 'literal', value: { literalType: { case: 'i64', value } } },
  });
}

export async function applySelectedRelationSortFetch(
  session: CanvasRelationAnalysisSession,
  request: SelectedSortFetchRequest
): Promise<SubstraitDocument> {
  const messageName = request.operation === 'sort' ? 'SortRel' : 'FetchRel';
  if (
    !DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
      (entry) =>
        entry.profileStatus === 'supported-profile' &&
        entry.entryId.endsWith(`/substrait.${messageName}`)
    )
  )
    throw new SubstraitAnalysisError(
      'unsupported_relation',
      'Unary operation is not admitted.',
      request.relationId
    );
  const prepared = await prepareSelectedRelationUnary(session, request, request.operation);
  const { target, input, schema, binding } = prepared;
  const relation =
    request.intent === 'edit'
      ? cloneLocalRelation(target.relation, [input.relation])
      : create(RelSchema, {
          relType:
            request.operation === 'sort'
              ? {
                  case: 'sort',
                  value: { common: { relAnchor: binding.relAnchor }, input: input.relation },
                }
              : {
                  case: 'fetch',
                  value: { common: { relAnchor: binding.relAnchor }, input: input.relation },
                },
        });
  if (request.operation === 'sort' && relation.relType.case === 'sort') {
    const fields = new Map(
      schema.bindings
        .filter((field) => field.parentFieldId == null)
        .map((field) => [field.fieldId, field.outputOrdinal])
    );
    if (
      request.keys.length === 0 ||
      new Set(request.keys.map((key) => key.fieldId)).size !== request.keys.length ||
      request.keys.some(
        (key) => !fields.has(key.fieldId) || !selectedSortDirections.has(key.direction)
      )
    )
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Sort keys must be unique fields of the selected input with explicit NULL placement.',
        request.relationId
      );
    relation.relType.value.sorts = request.keys.map((key) =>
      create(SortFieldSchema, {
        expr: dvtSubstraitExpression.field(fields.get(key.fieldId)!),
        sortKind: { case: 'direction', value: key.direction },
      })
    );
  }
  if (request.operation === 'fetch' && relation.relType.case === 'fetch') {
    relation.relType.value.offsetExpr = i64Literal(request.offset);
    relation.relType.value.countExpr = i64Literal(request.count);
  }
  return commitSelectedRelationUnary(session, prepared, relation);
}
