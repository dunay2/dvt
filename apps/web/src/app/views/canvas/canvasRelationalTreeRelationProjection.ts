/** Owned concern: project one canonical Substrait relation subtree into the Canvas tree read model. */
import type { Expression, Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';
import { dvtSubstraitExpressionReader } from '@dvt/postgres-projection';

import { canvasPresentationOperationForRel } from './canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeExpressionRef,
  CanvasRelationalTreeField,
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';

type RelationBinding = DvtSubstraitAuthoringSidecarV1['relations'][number];

import {
  childInputs,
  relationAnchor,
  isAdmittedSort,
  isAdmittedFetch,
} from './canvasRelationalTraversal';

function operator(rel: Rel): CanvasRelationalTreeOperator {
  switch (rel.relType.case) {
    case 'read':
    case 'project':
    case 'filter':
    case 'join':
    case 'cross':
    case 'set':
    case 'aggregate':
      return rel.relType.case;
    case 'sort':
      return isAdmittedSort(rel) ? 'sort' : 'unsupported';
    case 'fetch':
      return isAdmittedFetch(rel) ? 'fetch' : 'unsupported';
    default:
      return 'unsupported';
  }
}

function expressionRefs(rel: Rel): readonly CanvasRelationalTreeExpressionRef[] {
  switch (rel.relType.case) {
    case 'filter':
      return rel.relType.value.condition == null ? [] : [{ slot: 'filter-condition', ordinal: 0 }];
    case 'join':
      return rel.relType.value.expression == null ? [] : [{ slot: 'join-condition', ordinal: 0 }];
    case 'project':
      return rel.relType.value.expressions.map((_, ordinal) => ({
        slot: 'project-expression',
        ordinal,
      }));
    case 'aggregate': {
      const aggregate = rel.relType.value;
      return [
        ...aggregate.groupingExpressions.map((_, ordinal) => ({
          slot: 'aggregate-expression' as const,
          ordinal,
        })),
        ...aggregate.measures.map((_, ordinal) => ({
          slot: 'aggregate-expression' as const,
          ordinal: aggregate.groupingExpressions.length + ordinal,
        })),
      ];
    }
    case 'sort':
      return rel.relType.value.sorts.map((_, ordinal) => ({ slot: 'sort-key', ordinal }));
    default:
      return [];
  }
}

function windowCount(expressions: readonly Expression[]): number {
  return expressions.filter((expression) => expression.rexType.case === 'windowFunction').length;
}

function fieldsForRelation(
  sidecar: DvtSubstraitAuthoringSidecarV1,
  relationId: string | null
): readonly CanvasRelationalTreeField[] {
  if (relationId == null) return [];
  return sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
    .map((field) => ({
      fieldId: field.fieldId,
      outputOrdinal: field.outputOrdinal,
      displayName: field.displayName ?? null,
      sourceFieldId: field.sourceFieldId ?? null,
      operandFieldIds: field.operandFieldIds ?? [],
    }));
}

function directionLabel(value: SortField_SortDirection): string {
  switch (value) {
    case SortField_SortDirection.ASC_NULLS_FIRST:
      return 'ASC NULLS FIRST';
    case SortField_SortDirection.ASC_NULLS_LAST:
      return 'ASC NULLS LAST';
    case SortField_SortDirection.DESC_NULLS_FIRST:
      return 'DESC NULLS FIRST';
    case SortField_SortDirection.DESC_NULLS_LAST:
      return 'DESC NULLS LAST';
    default:
      return '';
  }
}

function sortFetchSummary(
  rel: Rel,
  sidecar: DvtSubstraitAuthoringSidecarV1,
  relationByAnchor: ReadonlyMap<number, RelationBinding>
): string | null {
  if (rel.relType.case === 'fetch') {
    const literal = (expression: typeof rel.relType.value.countExpr): bigint | null => {
      const value =
        expression == null ? null : dvtSubstraitExpressionReader.literalValue(expression);
      return value?.dataType === 'i64' ? value.value : null;
    };
    return `LIMIT ${literal(rel.relType.value.countExpr)?.toString() ?? 'ALL'} · OFFSET ${literal(rel.relType.value.offsetExpr)?.toString() ?? '0'}`;
  }
  if (rel.relType.case !== 'sort' || rel.relType.value.input == null) return null;
  const inputAnchor = relationAnchor(rel.relType.value.input);
  const inputRelation = inputAnchor == null ? undefined : relationByAnchor.get(inputAnchor);
  const inputFields =
    inputRelation == null ? [] : fieldsForRelation(sidecar, inputRelation.relationId);
  return rel.relType.value.sorts
    .map((field) => {
      const ordinal = dvtSubstraitExpressionReader.fieldOrdinal(field.expr);
      const name = ordinal == null ? null : inputFields[ordinal]?.displayName;
      const value = field.sortKind.case === 'direction' ? directionLabel(field.sortKind.value) : '';
      return name == null || value.length === 0 ? null : `${name} ${value}`;
    })
    .filter((value): value is string => value != null)
    .join(' · ');
}

export function buildCanvasRelationalTreeRelation(
  args: Readonly<{
    rel: Rel;
    path: string;
    semanticDigest: string;
    sidecar: DvtSubstraitAuthoringSidecarV1;
    relationByAnchor: ReadonlyMap<number, RelationBinding>;
  }>
): CanvasRelationalTreeNode {
  const anchor = relationAnchor(args.rel);
  const binding = anchor == null ? undefined : args.relationByAnchor.get(anchor);
  const relationId = binding?.relationId ?? null;
  const inputs = childInputs(args.rel);
  const windows =
    args.rel.relType.case === 'project' ? windowCount(args.rel.relType.value.expressions) : 0;
  return {
    locator: `rel:${args.semanticDigest}:${args.path}`,
    operator: operator(args.rel),
    substraitKind: args.rel.relType.case ?? 'unknown',
    operation: canvasPresentationOperationForRel(args.rel),
    relationId,
    displayName:
      sortFetchSummary(args.rel, args.sidecar, args.relationByAnchor) ??
      binding?.displayName ??
      null,
    sourceRef: binding?.sourceRef ?? null,
    output: { fields: fieldsForRelation(args.sidecar, relationId) },
    expressionRefs: expressionRefs(args.rel),
    decorations: windows === 0 ? [] : [{ kind: 'window', count: windows }],
    children: inputs.map((input) => ({
      role: input.role,
      ordinal: input.ordinal,
      node: buildCanvasRelationalTreeRelation({
        ...args,
        rel: input.rel,
        path: `${args.path}/${input.role}:${input.ordinal}`,
      }),
    })),
  };
}
