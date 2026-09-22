/** Owned concern: render admitted grouping and grouped rank over any projected input. */
import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import {
  pgColumnRef,
  pgCountRows,
  pgRangeSubselect,
  pgRowNumberOverCount,
  type PostgresAstNode,
} from './postgresAst.js';
export function buildGroupedRelationalPostgresAst(
  inputAst: PostgresAstNode,
  composition: Readonly<{
    kind: 'set' | 'aggregate' | 'window';
    groupFieldName?: string;
    measureName?: string;
    windowName?: string;
  }>,
  alias: string
): PostgresAstNode {
  const groupFieldName = composition.groupFieldName;
  const measureName = composition.measureName;
  if (
    groupFieldName == null ||
    measureName == null ||
    (composition.kind === 'window' && composition.windowName == null)
  ) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL relational wrapper projection requires canonical grouping metadata.'
    );
  }
  const groupExpression = pgColumnRef(groupFieldName);
  return {
    SelectStmt: {
      targetList: [
        { ResTarget: { val: groupExpression } },
        { ResTarget: { name: measureName, val: pgCountRows() } },
        ...(composition.kind === 'window'
          ? [
              {
                ResTarget: {
                  name: composition.windowName,
                  val: pgRowNumberOverCount(groupExpression),
                },
              },
            ]
          : []),
      ],
      fromClause: [pgRangeSubselect(inputAst, alias)],
      groupClause: [groupExpression],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}
