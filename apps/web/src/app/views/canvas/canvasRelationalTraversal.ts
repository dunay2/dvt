/** Owned concern: traverse admitted canonical relations identically in Canvas read models. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { dvtSubstraitExpressionReader } from '@dvt/postgres-projection';
import type { CanvasRelationalTreeChildRole } from './canvasRelationalTreeProjection';

type ChildInput = Readonly<{
  role: CanvasRelationalTreeChildRole;
  ordinal: number;
  rel: Rel;
}>;

export function relationAnchor(rel: Rel): number | null {
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

export function childInputs(rel: Rel): readonly ChildInput[] {
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

export function isAdmittedSort(rel: Rel): boolean {
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

export function isAdmittedFetch(rel: Rel): boolean {
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
