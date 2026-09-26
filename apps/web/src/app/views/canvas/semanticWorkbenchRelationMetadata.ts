/** Existing relation labels and expression ownership, shared by semantic graph projection. */
import type { Expression, Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { CSSProperties } from 'react';
import { childInputs } from './canvasRelationalTraversal';

export function sortDirectionLabel(value: SortField_SortDirection): string {
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

export const RELATION_STYLE: CSSProperties = {
  width: 184,
  minHeight: 56,
  padding: 0,
  border: '1px solid #2f4368',
  borderRadius: 8,
  background: '#0b1425',
  color: '#f8fafc',
  fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'left',
};

export function relationDisplayName(rel: Rel): string {
  switch (rel.relType.case) {
    case 'read': {
      const readType = rel.relType.value.readType;
      const objectName =
        readType.case === 'namedTable' ? readType.value.names.join('.') : readType.case || 'source';
      return `SOURCE\n${objectName}`;
    }
    case 'filter':
      return 'FILTER\nFilterRel';
    case 'project':
      return 'PROJECT\nProjectRel';
    case 'join':
      return 'JOIN · INNER';
    case 'aggregate':
      return 'GROUP\nAggregateRel';
    case 'set':
      return 'SET\nSetRel';
    case undefined:
      return 'RELATION\nunknown';
    default:
      return `${rel.relType.case.toUpperCase()}\n${rel.relType.case}`;
  }
}

export function relationInputs(rel: Rel): readonly Rel[] {
  return childInputs(rel).map(({ rel: input }) => input);
}

export function relationSourceCount(rel: Rel): number {
  if (rel.relType.case === 'read') return 1;
  return relationInputs(rel).reduce((count, input) => count + relationSourceCount(input), 0);
}

export function expressionsOwnedByRelation(rel: Rel): readonly Expression[] {
  switch (rel.relType.case) {
    case 'filter':
      return rel.relType.value.condition == null ? [] : [rel.relType.value.condition];
    case 'join':
      return rel.relType.value.expression == null ? [] : [rel.relType.value.expression];
    case 'project':
      return rel.relType.value.expressions;
    case 'aggregate':
      return rel.relType.value.groupingExpressions;
    default:
      return [];
  }
}
