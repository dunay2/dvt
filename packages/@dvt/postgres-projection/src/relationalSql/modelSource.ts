/** Render saved canonical semantics over authorized logical inputs, without expanding producers. */
import {
  deriveSubstraitPublication,
  deriveSubstraitSchemas,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import { pgColumnRef, type PostgresAstNode } from '../postgresAst.js';
import { renderPostgresAst } from '../renderPostgresAst.js';
import { simplifyPostgresSqlAst } from '../sqlPresentation/simplify.js';
import type { ModelSqlSourceInput } from '../sqlSource/context.js';
import { sourcePublicationOrdinals } from '../sqlSource/publication.js';

import { relationSql } from './relations.js';
import { projectSqlResult } from './resultProjection.js';
import { selectAst, unsupported, type SqlInput } from './scope.js';

export async function projectModelSqlSource(
  document: SubstraitDocument,
  inputs: readonly ModelSqlSourceInput[]
): Promise<string> {
  const analysis = deriveSubstraitSchemas(document);
  const unavailableReads = new Set<string>();
  for (const entry of analysis.index.relations.values()) {
    if (entry.relation.relType.case !== 'read') continue;
    const input = inputs.find(
      (candidate) => candidate.retainedRead?.binding.relationId === entry.binding.relationId
    );
    if (input == null) return unsupported('Saved Read has no current logical input.');
    const visible = new Set(sourcePublicationOrdinals(entry, input));
    for (const field of entry.fields)
      if (!visible.has(field.outputOrdinal)) unavailableReads.add(field.fieldId);
  }
  const publication = deriveSubstraitPublication(document, unavailableReads);
  const root = publication.get(analysis.index.rootId)!;
  if (root.rowUnavailable || root.unavailableFieldIds.length > 0)
    return unsupported('The saved output depends on unpublished logical input fields.');
  const rendered = new Map<string, SqlInput>();
  for (const id of analysis.index.postorder) {
    const entry = analysis.index.relations.get(id)!;
    const fields = analysis.schemas.get(id)!;
    if (entry.relation.relType.case === 'read') {
      const input = inputs.find((candidate) => candidate.retainedRead?.binding.relationId === id);
      if (input == null) return unsupported('Saved Read has no current logical input.');
      const range: PostgresAstNode = {
        RangeVar: { relname: input.sqlName, inh: true, relpersistence: 'p' },
      };
      const ordinals = sourcePublicationOrdinals(entry, input);
      const targets = input.columns.map((column, position) => ({
        ResTarget: { name: `c${ordinals[position]!}`, val: pgColumnRef(column.name) },
      }));
      rendered.set(id, {
        ast: selectAst([], [range], { targetList: targets }),
        fields,
        orderBy: [],
      });
    } else {
      const validity = publication.get(id)!;
      if (validity.rowUnavailable)
        return unsupported('Saved row semantics depend on unpublished logical fields.');
      const unavailable = new Set(
        entry.fields
          .filter((field) => validity.unavailableFieldIds.includes(field.fieldId))
          .map((field) => field.outputOrdinal)
      );
      let lowered = relationSql(
        document.plan,
        entry,
        entry.inputs.map((input) => rendered.get(input)!),
        fields,
        unavailable
      );
      // Physical i64 lowering uses an explicit cast. Source Fetch syntax instead
      // carries the already admitted nonnegative i64 constant, without admitting casts.
      if (entry.relation.relType.case === 'fetch') {
        const select = lowered.ast['SelectStmt'];
        if (select == null || typeof select !== 'object')
          return unsupported('Fetch SELECT is absent.');
        const limits: Record<string, PostgresAstNode> = {};
        for (const [key, expression] of [
          ['limitCount', entry.relation.relType.value.countExpr],
          ['limitOffset', entry.relation.relType.value.offsetExpr],
        ] as const) {
          if (
            expression?.rexType.case !== 'literal' ||
            expression.rexType.value.literalType.case !== 'i64'
          )
            continue;
          const value = expression.rexType.value.literalType.value;
          limits[key] = {
            A_Const:
              value <= 2_147_483_647n
                ? { ival: { ival: Number(value) } }
                : { fval: { fval: value.toString() } },
          };
        }
        lowered = { ...lowered, ast: { SelectStmt: { ...select, ...limits } } };
      }
      rendered.set(id, lowered);
    }
  }
  const ast = projectSqlResult(
    document,
    analysis.index.rootId,
    rendered.get(analysis.index.rootId)!
  ).ast;
  // The local logical namespace proves names only. It does not claim native
  // pg_catalog scalar evidence: rules requiring that evidence remain closed.
  const presentation = simplifyPostgresSqlAst(ast, {
    resolvedColumns: inputs.map((input) => ({
      schema: 'public',
      table: input.sqlName,
      columns: input.columns.map((column) => column.name),
    })),
  });
  return renderPostgresAst(presentation.ast);
}
