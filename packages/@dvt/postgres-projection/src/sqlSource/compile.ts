/** Compile a bounded source SELECT into one pinned canonical document; perform no I/O. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  PlanRelSchema,
  PlanSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create, toBinary } from '@bufbuild/protobuf';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  type ModelSqlInputAddition,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import { deriveSubstraitSchemas, type SubstraitDocument } from '@dvt/substrait-analysis';

import type { PostgresAstNode } from '../postgresAst.js';

import {
  appendSourceRelation,
  createSqlCompilationState,
  nextSourceRelation,
  sourceBudget,
  sourceError,
  sourceNameScope,
  sourceOutputFields,
  sqlList,
  sqlObject,
  type ModelSqlSourceContext,
  type SqlCompilationState,
  type SqlScope,
} from './context.js';
import { preserveSqlOutputIdentity } from './identity.js';
import { prepareRetainedSourceAuthority } from './occurrence.js';
import { fetchSqlSource, orderSqlSource } from './ordering.js';
import { sourcePredicate } from './predicates.js';
import { combineSqlSources, sourceFromSyntax } from './relations.js';
import { projectSourceTargets, selectSourceTargets } from './selection.js';

const selectFields = new Set([
  'distinctClause',
  'intoClause',
  'targetList',
  'fromClause',
  'whereClause',
  'groupClause',
  'groupDistinct',
  'havingClause',
  'windowClause',
  'valuesLists',
  'sortClause',
  'limitOffset',
  'limitCount',
  'limitOption',
  'lockingClause',
  'withClause',
  'op',
  'all',
  'larg',
  'rarg',
]);
function admitSelect(node: PostgresAstNode): PostgresAstNode {
  if (Object.keys(node).length !== 1 || node['SelectStmt'] == null)
    return sourceError('unsupported_sql', 'Exactly one SELECT source is required.', node);
  const select = sqlObject(node['SelectStmt']);
  if (
    Object.keys(select).some((key) => !selectFields.has(key)) ||
    ['distinctClause', 'groupClause', 'windowClause', 'valuesLists', 'lockingClause'].some(
      (key) => sqlList(select[key]).length > 0
    ) ||
    ['intoClause', 'havingClause', 'withClause', 'larg', 'rarg'].some(
      (key) => select[key] != null
    ) ||
    select['groupDistinct'] === true ||
    select['all'] === true ||
    (select['op'] != null && select['op'] !== 'SETOP_NONE') ||
    ![undefined, 'LIMIT_OPTION_DEFAULT', 'LIMIT_OPTION_COUNT'].includes(
      select['limitOption'] as string | undefined
    )
  )
    return sourceError(
      'unsupported_sql',
      'SELECT contains a construct outside the admitted Model source profile.',
      select
    );
  return select;
}
function compileSelect(state: SqlCompilationState, node: PostgresAstNode, depth: number): SqlScope {
  sourceBudget(state);
  if (depth > 64)
    return sourceError('unsupported_sql', 'SELECT nesting exceeds the source profile.', node);
  const select = admitSelect(node);
  const sources = sqlList(select['fromClause']);
  if (sources.length === 0)
    return sourceError('unknown_input', 'SELECT requires a prepared logical Model input.', select);
  const from = (value: unknown): SqlScope =>
    sourceFromSyntax(
      state,
      sqlObject(value),
      (query, nested) => compileSelect(state, query, nested),
      depth + 1
    );
  let scope = sources.map(from).reduce((left, right) => combineSqlSources(state, left, right));
  if (select['whereClause'] != null) {
    const condition = sourcePredicate(
      state,
      sourceNameScope(state, scope),
      sqlObject(select['whereClause'])
    );
    const binding = nextSourceRelation(state);
    scope = {
      bindings: scope.bindings,
      entry: appendSourceRelation(state, {
        relation: create(RelSchema, {
          relType: {
            case: 'filter',
            value: {
              common: { relAnchor: binding.relAnchor },
              input: scope.entry.relation,
              condition,
            },
          },
        }),
        binding,
        inputs: [scope.entry.binding.relationId],
        fields: sourceOutputFields(
          binding.relationId,
          scope.entry.fields.map((field) => field.displayName!),
          scope.entry.fields.map((field) => field.fieldId)
        ),
      }),
    };
  }
  const selected = selectSourceTargets(state, scope, select['targetList']);
  scope = orderSqlSource(state, scope, selected, select['sortClause']);
  scope = projectSourceTargets(state, scope, selected);
  return fetchSqlSource(state, scope, select['limitOffset'], select['limitCount']);
}
export function compileModelSqlSource(
  ast: PostgresAstNode,
  context: ModelSqlSourceContext
): Readonly<{
  document: SubstraitDocument;
  inputAdditions: readonly ModelSqlInputAddition[];
}> {
  const state = createSqlCompilationState(context);
  prepareRetainedSourceAuthority(state);
  const root = compileSelect(state, ast, 0);
  state.plan.relations = [
    create(PlanRelSchema, {
      relType: {
        case: 'root',
        value: {
          input: root.entry.relation,
          names: root.entry.fields.map((field) => field.displayName!),
        },
      },
    }),
  ];
  const document = preserveSqlOutputIdentity(
    {
      plan: state.plan,
      sidecar: {
        schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
        semanticPlanSha256: sha256Hex(toBinary(PlanSchema, state.plan)),
        relations: state.entries.map((entry) => entry.binding),
        fields: state.entries.flatMap((entry) => [...entry.fields]),
      },
    },
    context.currentDocument
  );
  deriveSubstraitSchemas(document);
  return { document, inputAdditions: [...state.consumed.values()] };
}
