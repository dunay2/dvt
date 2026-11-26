/** Lower the admitted scalar row to PostgreSQL syntax without a physical range. */
import type {
  Expression,
  ReadRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { pgStringLiteral, type PostgresAstNode } from '../postgresAst.js';
import { pgBooleanLiteral } from '../postgresPredicateAst.js';

import { selectAst, unsupported } from './scope.js';

function literalAst(field: Expression): PostgresAstNode {
  if (field.rexType.case !== 'literal') return unsupported('Expected a literal row field.');
  const kind = field.rexType.value.literalType;
  switch (kind.case) {
    case 'i32':
      return { A_Const: { ival: { ival: kind.value } } };
    case 'boolean':
      return pgBooleanLiteral(kind.value);
    case 'string':
      return pgStringLiteral(kind.value);
    default:
      return unsupported('Literal type is outside the PostgreSQL row profile.');
  }
}

export function literalRowColumns(read: ReadRel): readonly PostgresAstNode[] {
  if (read.readType.case !== 'virtualTable' || read.readType.value.expressions.length !== 1)
    return unsupported('Expected one virtual row.');
  return read.readType.value.expressions[0]!.fields.map(literalAst);
}

export function literalModelSelect(read: ReadRel): PostgresAstNode {
  const names = read.baseSchema!.names;
  return selectAst([], [], {
    targetList: literalRowColumns(read).map((val, ordinal) => ({
      ResTarget: { name: names[ordinal]!, val },
    })),
  });
}
