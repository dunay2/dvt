/** Render saved canonical semantics over authorized logical inputs, without expanding producers. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { isDvtSubstraitLiteralRowPlanV1 } from '@dvt/contracts';
import {
  deriveSubstraitPublication,
  deriveSubstraitSchemas,
  type IndexedRelation,
  type SchemaField,
  type SubstraitSchemas,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import { pgColumnRef, type PostgresAstNode } from '../postgresAst.js';
import { renderPostgresAst } from '../renderPostgresAst.js';
import { simplifyPostgresSqlAst } from '../sqlPresentation/simplify.js';
import type { ModelSqlSourceInput } from '../sqlSource/context.js';
import { sourcePublicationOrdinals } from '../sqlSource/publication.js';

import { literalModelSelect } from './literalRow.js';
import { relationSql } from './relations.js';
import { projectSqlResult } from './resultProjection.js';
import { selectAst, unsupported, type SqlInput } from './scope.js';

function logicalReads(
  analysis: SubstraitSchemas,
  inputs: readonly ModelSqlSourceInput[]
): { reads: Map<string, SqlInput>; unavailable: Set<string> } {
  const reads = new Map<string, SqlInput>();
  const unavailable = new Set<string>();
  for (const [id, entry] of analysis.index.relations) {
    if (entry.relation.relType.case !== 'read') continue;
    const input = inputs.find((candidate) => candidate.retainedRead?.binding.relationId === id);
    if (!input) return unsupported('Saved Read has no current logical input.');
    const ordinals = sourcePublicationOrdinals(entry, input);
    const visible = new Set(ordinals);
    entry.fields
      .filter((field) => !visible.has(field.outputOrdinal))
      .forEach((field) => unavailable.add(field.fieldId));
    const targets = input.columns.map((column, position) => ({
      ResTarget: { name: `c${ordinals[position]!}`, val: pgColumnRef(column.name) },
    }));
    const range = { RangeVar: { relname: input.sqlName, inh: true, relpersistence: 'p' } };
    reads.set(id, {
      ast: selectAst([], [range], { targetList: targets }),
      fields: analysis.schemas.get(id)!,
      orderBy: [],
    });
  }
  return { reads, unavailable };
}

function fetchLiteral(expr: Expression | undefined): PostgresAstNode | undefined {
  if (expr?.rexType.case !== 'literal') return undefined;
  const kind = expr.rexType.value.literalType;
  if (kind.case !== 'i64') return undefined;
  const value = kind.value;
  return {
    A_Const:
      value <= 2_147_483_647n
        ? { ival: { ival: Number(value) } }
        : { fval: { fval: value.toString() } },
  };
}

function sourceFetch(entry: IndexedRelation, lowered: SqlInput): SqlInput {
  const relation = entry.relation.relType;
  if (relation.case !== 'fetch') return lowered;
  const select = lowered.ast['SelectStmt'];
  if (select == null || typeof select !== 'object') return unsupported('Fetch SELECT is absent.');
  const limits: Record<string, PostgresAstNode> = {};
  for (const [key, expr] of [
    ['limitCount', relation.value.countExpr],
    ['limitOffset', relation.value.offsetExpr],
  ] as const) {
    const bound = fetchLiteral(expr);
    if (bound) limits[key] = bound;
  }
  return { ...lowered, ast: { SelectStmt: { ...select, ...limits } } };
}

function sourceOperation(
  document: SubstraitDocument,
  entry: IndexedRelation,
  inputs: readonly SqlInput[],
  output: { fields: readonly SchemaField[]; unavailableFieldIds: readonly string[] }
): SqlInput {
  const { fields, unavailableFieldIds } = output;
  const denied = new Set(unavailableFieldIds);
  const ordinals = entry.fields
    .filter((field) => denied.has(field.fieldId))
    .map((field) => field.outputOrdinal);
  return sourceFetch(entry, relationSql(document.plan, entry, inputs, fields, new Set(ordinals)));
}

function logicalModelSelect(
  document: SubstraitDocument,
  analysis: SubstraitSchemas,
  inputs: readonly ModelSqlSourceInput[]
): PostgresAstNode {
  const { reads: rendered, unavailable } = logicalReads(analysis, inputs);
  const publication = deriveSubstraitPublication(document, unavailable);
  const root = publication.get(analysis.index.rootId)!;
  if (root.rowUnavailable || root.unavailableFieldIds.length > 0)
    return unsupported('The saved output depends on unpublished logical input fields.');
  for (const id of analysis.index.postorder) {
    if (rendered.has(id)) continue;
    const validity = publication.get(id)!;
    if (validity.rowUnavailable)
      return unsupported('Saved row semantics depend on unpublished logical fields.');
    const entry = analysis.index.relations.get(id)!;
    const sources = entry.inputs.map((input) => rendered.get(input)!);
    rendered.set(
      id,
      sourceOperation(document, entry, sources, {
        fields: analysis.schemas.get(id)!,
        unavailableFieldIds: validity.unavailableFieldIds,
      })
    );
  }
  return projectSqlResult(document, analysis.index.rootId, rendered.get(analysis.index.rootId)!)
    .ast;
}

export async function projectModelSqlSource(
  document: SubstraitDocument,
  inputs: readonly ModelSqlSourceInput[]
): Promise<string> {
  const analysis = deriveSubstraitSchemas(document);
  const root = analysis.index.relations.get(analysis.index.rootId)!.relation.relType;
  if (root.case === 'read' && root.value.readType.case === 'virtualTable') {
    if (inputs.length > 0 || !isDvtSubstraitLiteralRowPlanV1(document.plan, document.sidecar))
      return unsupported('Saved literal model has contradictory schema or inputs.');
    return renderPostgresAst(literalModelSelect(root.value));
  }
  const ast = logicalModelSelect(document, analysis, inputs);
  // The logical namespace proves names only. Rules requiring pg_catalog scalar evidence remain closed.
  const presentation = simplifyPostgresSqlAst(ast, {
    resolvedColumns: inputs.map((input) => ({
      schema: 'public',
      table: input.sqlName,
      columns: input.columns.map((column) => column.name),
    })),
  });
  return renderPostgresAst(presentation.ast);
}
