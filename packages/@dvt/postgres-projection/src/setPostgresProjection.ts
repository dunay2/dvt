/** Owns PostgreSQL AST projection for the admitted SetRel family. */
import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import { buildGroupedRelationalPostgresAst } from './groupedRelationalPostgresAst.js';
import { pgColumnRef, pgRangeSubselect, pgRangeVar, type PostgresAstNode } from './postgresAst.js';
import { renderPostgresAst } from './renderPostgresAst.js';
import {
  inspectDvtSubstraitSetComposition,
  type DvtSubstraitSetComposition,
} from './substraitSetCompositionReader.js';
import type { DvtSubstraitSetDraft, DvtSubstraitSetProjection } from './substraitSetReadModel.js';

function inputAst(
  input: DvtSubstraitSetProjection['inputs'][number],
  canonicalFields: DvtSubstraitSetProjection['inputs'][number]['fields']
): PostgresAstNode {
  return {
    targetList: input.fields.map((field, ordinal) => ({
      ResTarget: {
        ...(canonicalFields[ordinal]?.name === field.name
          ? {}
          : { name: canonicalFields[ordinal]?.name }),
        val: pgColumnRef(field.name),
      },
    })),
    fromClause: [pgRangeVar({ schema: input.schema, table: input.table })],
    limitOption: 'LIMIT_OPTION_DEFAULT',
    op: 'SETOP_NONE',
  };
}

function setOperationAst(operation: DvtSubstraitSetProjection['operation']): Readonly<{
  op: 'SETOP_UNION' | 'SETOP_INTERSECT' | 'SETOP_EXCEPT';
  all: boolean;
}> {
  switch (operation) {
    case 'union_all':
      return { op: 'SETOP_UNION', all: true };
    case 'union_distinct':
      return { op: 'SETOP_UNION', all: false };
    case 'intersect_distinct':
      return { op: 'SETOP_INTERSECT', all: false };
    case 'except_distinct':
      return { op: 'SETOP_EXCEPT', all: false };
    case 'intersect_all':
      return { op: 'SETOP_INTERSECT', all: true };
    case 'except_all':
      return { op: 'SETOP_EXCEPT', all: true };
  }
}

function isIdentityOutputProjection(projection: DvtSubstraitSetProjection): boolean {
  const first = projection.inputs[0];
  return (
    first != null &&
    projection.outputs.length === first.fields.length &&
    projection.outputs.every(
      (output, ordinal) =>
        output.fieldKey === first.fields[ordinal]?.name && output.name === output.fieldKey
    )
  );
}

export function buildDvtSetPostgresAst(projection: DvtSubstraitSetProjection): PostgresAstNode {
  const first = projection.inputs[0];
  if (first == null || projection.inputs.length < 2 || projection.outputs.length === 0) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL Set projection requires at least two inputs and one output.'
    );
  }
  const operation = setOperationAst(projection.operation);
  let set = inputAst(first, first.fields);
  for (const input of projection.inputs.slice(1)) {
    set = {
      ...operation,
      larg: set,
      rarg: inputAst(input, first.fields),
      limitOption: 'LIMIT_OPTION_DEFAULT',
    };
  }
  const setAst = { SelectStmt: set };
  if (isIdentityOutputProjection(projection)) return setAst;
  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => ({
        ResTarget: {
          ...(output.name === output.fieldKey ? {} : { name: output.name }),
          val: pgColumnRef(output.fieldKey),
        },
      })),
      fromClause: [pgRangeSubselect(setAst, 'set_input')],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

export function buildSetCompositionPostgresAst(
  composition: DvtSubstraitSetComposition
): PostgresAstNode {
  const ast = buildDvtSetPostgresAst(composition.baseProjection);
  return composition.kind === 'set'
    ? ast
    : buildGroupedRelationalPostgresAst(ast, composition, 'set_input');
}

export async function projectDvtSetDraftToPostgresSql(
  draft: DvtSubstraitSetDraft
): Promise<Readonly<{ sql: string; projection: DvtSubstraitSetProjection; ast: PostgresAstNode }>> {
  const inspection = inspectDvtSubstraitSetComposition(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      `PostgreSQL projection requires an admitted N-input SetRel shape: ${inspection.reason}.`
    );
  }
  const composition = inspection.value;
  const ast = buildSetCompositionPostgresAst(composition);
  return { projection: composition.projection, ast, sql: await renderPostgresAst(ast) };
}
