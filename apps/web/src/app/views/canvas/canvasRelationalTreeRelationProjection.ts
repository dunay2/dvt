/** Owned concern: project one canonical Substrait relation subtree into the Canvas tree read model. */
import type { Expression, Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';
import { dvtSubstraitExpressionReader } from '@dvt/postgres-projection';

import { canvasPresentationOperationForRel } from './canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeExpressionRef,
  CanvasRelationalTreeField,
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';

type RelationBinding = DvtSubstraitAuthoringSidecarV1['relations'][number];

type ChildInput = Readonly<{
  role: CanvasRelationalTreeChildRole;
  ordinal: number;
  rel: Rel;
}>;

function relationAnchor(rel: Rel): number | null {
  switch (rel.relType.case) {
    case 'read':
    case 'project':
    case 'filter':
    case 'join':
    case 'cross':
    case 'set':
    case 'aggregate':
    case 'sort':
    case 'fetch':
      return rel.relType.value.common?.relAnchor ?? null;
    default: {
      const value: unknown = rel.relType.value;
      if (value == null || typeof value !== 'object') return null;
      const common: unknown = (value as { common?: unknown }).common;
      if (common == null || typeof common !== 'object') return null;
      const anchor: unknown = (common as { relAnchor?: unknown }).relAnchor;
      return typeof anchor === 'number' ? anchor : null;
    }
  }
}

function requireRelation(value: Rel | undefined, label: string): Rel {
  if (value == null) throw new Error(`Canonical ${label} relation input is absent.`);
  return value;
}

function childInputs(rel: Rel): readonly ChildInput[] {
  switch (rel.relType.case) {
    case 'project':
    case 'filter':
    case 'aggregate':
      return [
        {
          role: 'input',
          ordinal: 0,
          rel: requireRelation(rel.relType.value.input, rel.relType.case),
        },
      ];
    case 'sort':
      return isAdmittedSort(rel)
        ? [{ role: 'input', ordinal: 0, rel: requireRelation(rel.relType.value.input, 'sort') }]
        : [];
    case 'fetch':
      return isAdmittedFetch(rel)
        ? [{ role: 'input', ordinal: 0, rel: requireRelation(rel.relType.value.input, 'fetch') }]
        : [];
    case 'join':
      return [
        { role: 'left', ordinal: 0, rel: requireRelation(rel.relType.value.left, 'JOIN left') },
        { role: 'right', ordinal: 1, rel: requireRelation(rel.relType.value.right, 'JOIN right') },
      ];
    case 'cross':
      return [
        { role: 'left', ordinal: 0, rel: requireRelation(rel.relType.value.left, 'CROSS left') },
        { role: 'right', ordinal: 1, rel: requireRelation(rel.relType.value.right, 'CROSS right') },
      ];
    case 'set':
      if (rel.relType.value.inputs.length === 0) throw new Error('Canonical SetRel has no inputs.');
      return rel.relType.value.inputs.map((input, ordinal) => ({
        role: ordinal === 0 ? 'primary' : 'secondary',
        ordinal,
        rel: input,
      }));
    default:
      return [];
  }
}

function isAdmittedSort(rel: Rel): boolean {
  if (rel.relType.case !== 'sort' || rel.relType.value.sorts.length === 0) return false;
  return rel.relType.value.sorts.every(
    (field) =>
      dvtSubstraitExpressionReader.fieldOrdinal(field.expr) != null &&
      field.sortKind.case === 'direction' &&
      (field.sortKind.value === SortField_SortDirection.ASC_NULLS_FIRST ||
        field.sortKind.value === SortField_SortDirection.ASC_NULLS_LAST ||
        field.sortKind.value === SortField_SortDirection.DESC_NULLS_FIRST ||
        field.sortKind.value === SortField_SortDirection.DESC_NULLS_LAST)
  );
}

function isAdmittedFetch(rel: Rel): boolean {
  if (rel.relType.case !== 'fetch') return false;
  const admitted = (expression: typeof rel.relType.value.offsetExpr): boolean => {
    if (expression == null) return true;
    const literal = dvtSubstraitExpressionReader.literalValue(expression);
    if (literal?.dataType === 'i64') return literal.value >= 0n;
    return (
      expression.rexType.case === 'literal' &&
      expression.rexType.value.literalType.case === 'null' &&
      expression.rexType.value.literalType.value.kind.case === 'i64'
    );
  };
  return admitted(rel.relType.value.offsetExpr) && admitted(rel.relType.value.countExpr);
}

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
