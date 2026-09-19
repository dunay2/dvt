/** Owns PostgreSQL AST projection for admitted UNION ALL and UNION DISTINCT SetRel. */
import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import { pgColumnRef, pgRangeVar, type PostgresAstNode } from './postgresAst.js';
import { renderPostgresAst } from './renderPostgresAst.js';
import { inspectDvtSubstraitSetDraft } from './substraitSetReader.js';
import type { DvtSubstraitSetDraft, DvtSubstraitSetProjection } from './substraitSetReadModel.js';

function inputAst(
  input: DvtSubstraitSetProjection['inputs'][number],
  outputs: DvtSubstraitSetProjection['outputs']
): PostgresAstNode {
  return {
    targetList: outputs.map((output) => ({
      ResTarget: {
        ...(output.name === output.fieldKey ? {} : { name: output.name }),
        val: pgColumnRef(output.fieldKey),
      },
    })),
    fromClause: [pgRangeVar({ schema: input.schema, table: input.table })],
    limitOption: 'LIMIT_OPTION_DEFAULT',
    op: 'SETOP_NONE',
  };
}

export function buildDvtSetPostgresAst(projection: DvtSubstraitSetProjection): PostgresAstNode {
  const first = projection.inputs[0];
  if (first == null || projection.inputs.length < 2 || projection.outputs.length === 0) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL Set projection requires at least two inputs and one output.'
    );
  }
  let union = inputAst(first, projection.outputs);
  for (const input of projection.inputs.slice(1)) {
    union = {
      op: 'SETOP_UNION',
      all: projection.operation === 'union_all',
      larg: union,
      rarg: inputAst(input, projection.outputs),
      limitOption: 'LIMIT_OPTION_DEFAULT',
    };
  }
  return { SelectStmt: union };
}

export async function projectDvtSetDraftToPostgresSql(
  draft: DvtSubstraitSetDraft
): Promise<Readonly<{ sql: string; projection: DvtSubstraitSetProjection }>> {
  const inspection = inspectDvtSubstraitSetDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection requires an admitted N-input SetRel shape.'
    );
  }
  return {
    projection: inspection.projection,
    sql: await renderPostgresAst(buildDvtSetPostgresAst(inspection.projection)),
  };
}
