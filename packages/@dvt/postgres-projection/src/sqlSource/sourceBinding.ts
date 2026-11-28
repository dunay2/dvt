/** Bind a PostgreSQL FROM reference to one prepared input and expose its lexical qualifiers. */
import { buildRelationalSourceObjectId } from '@dvt/contracts';

import type { PostgresAstNode } from '../postgresAst.js';

import {
  sourceError,
  type ModelSqlSourceInput,
  type SqlCompilationState,
  type SqlScope,
} from './context.js';
import { readSourceOccurrence } from './occurrence.js';
import { sourceAlias } from './references.js';

function matchesPhysicalPath(input: ModelSqlSourceInput, path: readonly string[]): boolean {
  if (!('sourceRef' in input.source)) return false;
  const [catalog, schema, table] = path;
  const { names, sourceRef } = input.source;
  if (path.length === 3) {
    const objectId = buildRelationalSourceObjectId({
      kind: 'relation',
      catalog: catalog!,
      schema: schema!,
      name: table!,
      relationType: 'table',
    });
    if (sourceRef.sourceObjectId !== objectId) return false;
  }
  const object = path.slice(-2);
  return object.every((part, index) => part === names[names.length - object.length + index]);
}

function selectPhysicalInput(
  inputs: readonly ModelSqlSourceInput[],
  path: readonly string[],
  alias: string | null,
  range: PostgresAstNode
): ModelSqlSourceInput {
  const matching = inputs.filter((input) => matchesPhysicalPath(input, path));
  if (matching.length === 1) return matching[0]!;
  const aliased = matching.find((input) => input.sqlName === alias);
  if (aliased != null) return aliased;
  if (matching.length > 1)
    return sourceError(
      'ambiguous_reference',
      'The physical name matches multiple prepared inputs. Use a unique logical name or alias.',
      range
    );
  return sourceError(
    'unknown_input',
    'The SQL input is outside the prepared Model context.',
    range
  );
}

export function bindSourceRange(state: SqlCompilationState, range: PostgresAstNode): SqlScope {
  const table = range['relname'];
  if (typeof table !== 'string')
    return sourceError('unknown_input', 'Expected a prepared Model input name.', range);
  const inputs = state.context.inputs;
  const alias = sourceAlias(range['alias']);
  const qualifier = alias ?? table;
  const path = [range['catalogname'], range['schemaname'], table].filter(
    (part): part is string => typeof part === 'string'
  );
  const logical = path.length === 1 ? inputs.find((input) => input.sqlName === table) : undefined;
  if (logical != null) return readSourceOccurrence(state, logical, qualifier);

  const input = selectPhysicalInput(inputs, path, alias, range);
  const scope = readSourceOccurrence(state, input, qualifier);
  return alias == null
    ? { ...scope, bindings: scope.bindings.map((binding) => ({ ...binding, physicalPath: path })) }
    : scope;
}
