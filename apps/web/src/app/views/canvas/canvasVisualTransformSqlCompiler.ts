/** Owned concern: compile the bounded visual transform recipe into deterministic PostgreSQL SQL. */
import type {
  VisualTransformExpressionV1,
  VisualTransformFilterV1,
  VisualTransformRecipeV1,
} from '@dvt/contracts';

export type VisualTransformSourceBinding = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  alias: string;
}>;

export type VisualTransformSqlCompilationErrorCode =
  | 'empty_outputs'
  | 'unknown_input_node'
  | 'invalid_source_binding'
  | 'invalid_expression'
  | 'constant_with_inputs'
  | 'unsupported_cast_type'
  | 'invalid_filter_value'
  | 'invalid_function_arguments';

export class VisualTransformSqlCompilationError extends Error {
  constructor(
    public readonly code: VisualTransformSqlCompilationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'VisualTransformSqlCompilationError';
  }
}

const POSTGRES_CAST_TYPES = new Set([
  'bigint',
  'boolean',
  'date',
  'integer',
  'jsonb',
  'numeric',
  'text',
  'timestamp',
  'timestamp with time zone',
  'timestamp without time zone',
  'uuid',
]);

type SqlExpression = string | readonly string[] | null;

function fail(code: VisualTransformSqlCompilationErrorCode, message: string): never {
  throw new VisualTransformSqlCompilationError(code, message);
}

export function quoteSqlIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return fail('invalid_expression', 'Visual SQL numeric literals must be finite.');
    }
    return String(value);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function requireSingleExpression(value: SqlExpression, operation: string): string {
  if (typeof value !== 'string') {
    return fail(
      'invalid_expression',
      `Visual SQL operation ${operation} requires exactly one current expression.`
    );
  }
  return value;
}

function compileFunction(
  functionId: 'trim' | 'upper' | 'lower' | 'coalesce' | 'concat',
  args: readonly (string | number | boolean | null)[],
  current: SqlExpression
): string {
  if (functionId === 'concat') {
    const inputs = Array.isArray(current) ? current : typeof current === 'string' ? [current] : [];
    if (inputs.length === 0 || args.length > 1) {
      return fail(
        'invalid_function_arguments',
        'Visual SQL concat requires input columns and at most one separator literal.'
      );
    }
    return args.length === 1
      ? `concat_ws(${quoteLiteral(args[0]!)}, ${inputs.join(', ')})`
      : `concat(${inputs.join(', ')})`;
  }

  const expression = requireSingleExpression(current, functionId);
  if (functionId === 'coalesce') {
    if (args.length === 0) {
      return fail(
        'invalid_function_arguments',
        'Visual SQL coalesce requires at least one fallback literal.'
      );
    }
    return `coalesce(${expression}, ${args.map(quoteLiteral).join(', ')})`;
  }
  if (args.length > 0) {
    return fail(
      'invalid_function_arguments',
      `Visual SQL function ${functionId} does not accept literal arguments.`
    );
  }
  return `${functionId}(${expression})`;
}

function compileExpression(
  expression: VisualTransformExpressionV1,
  sourceBinding: VisualTransformSourceBinding
): string {
  let current: SqlExpression = expression.inputs.map((input) => {
    if (input.nodeId !== sourceBinding.nodeId) {
      return fail(
        'unknown_input_node',
        `Visual SQL input node ${input.nodeId} is not the bound Preview source.`
      );
    }
    return `${quoteSqlIdentifier(sourceBinding.alias)}.${quoteSqlIdentifier(input.columnName)}`;
  });
  if (current.length === 0) current = null;
  else if (current.length === 1) current = current[0]!;

  for (const operation of expression.operations) {
    switch (operation.kind) {
      case 'passthrough':
        current = requireSingleExpression(current, operation.kind);
        break;
      case 'cast': {
        const targetType = operation.targetType.trim().toLowerCase().replaceAll(/\s+/g, ' ');
        if (!POSTGRES_CAST_TYPES.has(targetType)) {
          return fail(
            'unsupported_cast_type',
            `Visual SQL cast type ${operation.targetType} is not supported.`
          );
        }
        current = `cast(${requireSingleExpression(current, operation.kind)} as ${targetType})`;
        break;
      }
      case 'function':
        current = compileFunction(operation.functionId, operation.args, current);
        break;
      case 'constant':
        if (current !== null) {
          return fail(
            'constant_with_inputs',
            'Visual SQL constants cannot discard recorded input lineage.'
          );
        }
        current = quoteLiteral(operation.value);
        break;
    }
  }

  return requireSingleExpression(current, 'output');
}

function compileFilter(
  filter: VisualTransformFilterV1,
  sourceBinding: VisualTransformSourceBinding
): string {
  if (filter.input.nodeId !== sourceBinding.nodeId) {
    return fail(
      'unknown_input_node',
      `Visual SQL filter input node ${filter.input.nodeId} is not the bound Preview source.`
    );
  }
  const input = `${quoteSqlIdentifier(sourceBinding.alias)}.${quoteSqlIdentifier(filter.input.columnName)}`;
  if ('value' in filter && filter.value === null) {
    if (filter.operator === 'equals') return `${input} is null`;
    if (filter.operator === 'not_equals') return `${input} is not null`;
    return fail(
      'invalid_filter_value',
      `Visual SQL filter ${filter.operator} cannot compare an ordered value with null.`
    );
  }
  switch (filter.operator) {
    case 'equals':
      return `${input} = ${quoteLiteral(filter.value)}`;
    case 'not_equals':
      return `${input} <> ${quoteLiteral(filter.value)}`;
    case 'greater_than':
      return `${input} > ${quoteLiteral(filter.value)}`;
    case 'greater_than_or_equal':
      return `${input} >= ${quoteLiteral(filter.value)}`;
    case 'less_than':
      return `${input} < ${quoteLiteral(filter.value)}`;
    case 'less_than_or_equal':
      return `${input} <= ${quoteLiteral(filter.value)}`;
    case 'is_null':
      return `${input} is null`;
    case 'is_not_null':
      return `${input} is not null`;
  }
}

function assertSourceBinding(sourceBinding: VisualTransformSourceBinding): void {
  if (
    [sourceBinding.nodeId, sourceBinding.schema, sourceBinding.table, sourceBinding.alias].some(
      (value) => value.trim().length === 0
    )
  ) {
    fail('invalid_source_binding', 'Visual SQL requires one complete source binding.');
  }
}

export function compileVisualTransformRecipeToPostgresSql({
  recipe,
  sourceBinding,
}: Readonly<{
  recipe: VisualTransformRecipeV1;
  sourceBinding: VisualTransformSourceBinding;
}>): string {
  assertSourceBinding(sourceBinding);
  if (recipe.outputs.length === 0) {
    fail('empty_outputs', 'Visual SQL requires at least one output column.');
  }

  const selectLines = recipe.outputs.map(
    (output, index) =>
      `  ${compileExpression(output.expression, sourceBinding)} as ${quoteSqlIdentifier(output.name)}${
        index === recipe.outputs.length - 1 ? '' : ','
      }`
  );
  const sql = [
    'select',
    ...selectLines,
    `from ${quoteSqlIdentifier(sourceBinding.schema)}.${quoteSqlIdentifier(sourceBinding.table)} as ${quoteSqlIdentifier(sourceBinding.alias)}`,
  ];
  if (recipe.filters.length > 0) {
    sql.push(
      `where ${compileFilter(recipe.filters[0]!, sourceBinding)}`,
      ...recipe.filters.slice(1).map((filter) => `  and ${compileFilter(filter, sourceBinding)}`)
    );
  }
  sql[sql.length - 1] = `${sql.at(-1)};`;
  return `${sql.join('\n')}\n`;
}
