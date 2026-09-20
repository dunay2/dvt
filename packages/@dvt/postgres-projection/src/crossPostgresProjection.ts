/** Owns PostgreSQL AST construction for the admitted left-associated CrossRel chain. */
import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import { buildNInputJoinPostgresAst, nInputJoinAlias } from './joinPostgresProjection.js';
import {
  pgQualifiedColumnRef,
  pgRangeSubselect,
  pgRangeVar,
  type PostgresAstNode,
} from './postgresAst.js';
import { renderPostgresAst } from './renderPostgresAst.js';
import { inspectDvtSubstraitCrossDraft } from './substraitCrossReader.js';
import type {
  DvtSubstraitCrossDraft,
  DvtSubstraitCrossProjection,
} from './substraitCrossReadModel.js';
import { inspectDvtSubstraitMixedCrossDraft } from './substraitMixedCrossReader.js';

export function buildDvtCrossPostgresAst(projection: DvtSubstraitCrossProjection): PostgresAstNode {
  const firstInput = projection.inputs[0];
  if (
    firstInput == null ||
    projection.outputs.length === 0 ||
    projection.crossRelations.length !== projection.inputs.length - 1
  ) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection requires a complete CrossRel chain and selected outputs.'
    );
  }
  const bindings = new Map<string, { alias: string; name: string }>();
  projection.inputs.forEach((input, inputIndex) => {
    const alias = nInputJoinAlias(inputIndex);
    input.fields.forEach((field) => bindings.set(field.fieldId, { alias, name: field.name }));
  });
  let product: PostgresAstNode = pgRangeVar({
    schema: firstInput.schema,
    table: firstInput.table,
    alias: nInputJoinAlias(0),
  });
  for (let inputIndex = 1; inputIndex < projection.inputs.length; inputIndex += 1) {
    const input = projection.inputs[inputIndex]!;
    product = {
      JoinExpr: {
        jointype: 'JOIN_INNER',
        larg: product,
        rarg: pgRangeVar({
          schema: input.schema,
          table: input.table,
          alias: nInputJoinAlias(inputIndex),
        }),
      },
    };
  }
  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => {
        const source = bindings.get(output.source.fieldId);
        if (source == null) {
          throw new DvtSubstraitPostgresProjectionError(
            'unsupported_shape',
            'CrossRel output references a field outside its admitted inputs.'
          );
        }
        return {
          ResTarget: {
            name: output.name,
            val: pgQualifiedColumnRef(source.alias, source.name),
          },
        };
      }),
      fromClause: [product],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

export async function projectDvtCrossDraftToPostgresSql(
  draft: DvtSubstraitCrossDraft
): Promise<
  Readonly<{ sql: string; projection: DvtSubstraitCrossProjection; ast: PostgresAstNode }>
> {
  const inspection = inspectDvtSubstraitCrossDraft(draft);
  if (inspection.ok) {
    const ast = buildDvtCrossPostgresAst(inspection.projection);
    return { projection: inspection.projection, ast, sql: await renderPostgresAst(ast) };
  }
  const mixed = inspectDvtSubstraitMixedCrossDraft(draft);
  if (!mixed.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection requires an admitted CrossRel chain or bounded JOIN-to-CROSS tree.'
    );
  }
  const { projection, leftJoin, rightInput } = mixed.projection;
  const leftAlias = 'cross_left';
  const rightAlias = 'cross_right';
  const bindings = new Map<string, { alias: string; name: string }>();
  leftJoin.outputs.forEach((output) =>
    bindings.set(output.source.fieldId, { alias: leftAlias, name: output.name })
  );
  rightInput.fields.forEach((field) =>
    bindings.set(field.fieldId, { alias: rightAlias, name: field.name })
  );
  const ast: PostgresAstNode = {
    SelectStmt: {
      targetList: projection.outputs.map((output) => {
        const source = bindings.get(output.source.fieldId);
        if (source == null) {
          throw new DvtSubstraitPostgresProjectionError(
            'unsupported_shape',
            'The mixed CrossRel output references a field outside its effective inputs.'
          );
        }
        return {
          ResTarget: {
            name: output.name,
            val: pgQualifiedColumnRef(source.alias, source.name),
          },
        };
      }),
      fromClause: [
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeSubselect(buildNInputJoinPostgresAst(leftJoin), leftAlias),
            rarg: pgRangeVar({
              schema: rightInput.schema,
              table: rightInput.table,
              alias: rightAlias,
            }),
          },
        },
      ],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
  return {
    projection,
    ast,
    sql: await renderPostgresAst(ast),
  };
}
