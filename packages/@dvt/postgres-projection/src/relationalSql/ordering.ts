import type { SortField } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { pgColumnRef, type PostgresAstNode } from '../postgresAst.js';
import { postgresSortDirection, type DvtPostgresOrderKey } from '../sortFetchPostgresProjection.js';

import { unsupported } from './scope.js';

export function sortAst(
  node: PostgresAstNode,
  key: Omit<DvtPostgresOrderKey, 'name'>
): PostgresAstNode {
  return {
    SortBy: {
      node,
      sortby_dir: key.direction === 'ASC' ? 'SORTBY_ASC' : 'SORTBY_DESC',
      sortby_nulls: key.nulls === 'FIRST' ? 'SORTBY_NULLS_FIRST' : 'SORTBY_NULLS_LAST',
    },
  };
}
export function sortDirection(sort: SortField): Omit<DvtPostgresOrderKey, 'name'> {
  if (sort.sortKind.case !== 'direction')
    return unsupported('Custom sort functions are not admitted.');
  return postgresSortDirection(sort.sortKind.value);
}
export function orderClause(keys: readonly DvtPostgresOrderKey[]): PostgresAstNode[] {
  return keys.map((key) => sortAst(pgColumnRef(key.name), key));
}
