import {
  SetRel_SetOp,
  type SetRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { PostgresAstNode } from '../postgresAst.js';

import { inputColumns, inputRange, selectAst, unsupported, type SqlInput } from './scope.js';

const operations: Partial<Record<SetRel_SetOp, Readonly<{ op: string; all: boolean }>>> = {
  [SetRel_SetOp.UNION_ALL]: { op: 'SETOP_UNION', all: true },
  [SetRel_SetOp.UNION_DISTINCT]: { op: 'SETOP_UNION', all: false },
  [SetRel_SetOp.INTERSECTION_MULTISET]: { op: 'SETOP_INTERSECT', all: false },
  [SetRel_SetOp.INTERSECTION_MULTISET_ALL]: { op: 'SETOP_INTERSECT', all: true },
  [SetRel_SetOp.MINUS_PRIMARY]: { op: 'SETOP_EXCEPT', all: false },
  [SetRel_SetOp.MINUS_PRIMARY_ALL]: { op: 'SETOP_EXCEPT', all: true },
};
export function setSql(set: SetRel, inputs: readonly SqlInput[]): SqlInput {
  const operation = operations[set.op];
  if (operation == null || inputs.length < 2)
    return unsupported('SET operation requires admitted inputs.');
  const statements = inputs.map(
    (input) =>
      selectAst(inputColumns(input, 'set_input'), [inputRange(input, 'set_input')])[
        'SelectStmt'
      ] as PostgresAstNode
  );
  let statement = statements[0]!;
  for (const next of statements.slice(1))
    statement = { ...operation, larg: statement, rarg: next, limitOption: 'LIMIT_OPTION_DEFAULT' };
  return { ast: { SelectStmt: statement }, fields: inputs[0]!.fields, orderBy: [] };
}
