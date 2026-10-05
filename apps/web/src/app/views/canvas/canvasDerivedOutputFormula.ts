/** Input syntax only: compile directly to canonical Substrait; never persist a formula AST. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveFunctionReference,
} from '@dvt/postgres-projection';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { buildDvtSubstraitScalarFunction } from './canvasDvtSubstraitScalarFunction';
import { derivedOutputDataType } from './canvasDerivedOutputExpression';
import { bindFormulaNulls, formulaNull } from './canvasFormulaNull';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';

export type FormulaField = Readonly<{
  fieldId: string;
  name: string;
  dataType: string;
  expression: Expression;
}>;
type FormulaValue = Readonly<{
  expression: Expression;
  dataType: string;
  fieldIds: readonly string[];
  untypedNull?: boolean;
}>;
type FormulaToken = Readonly<{
  kind: 'string' | 'number' | 'name' | 'quoted' | 'symbol';
  value: string;
}>;

class FormulaReader {
  private cursor = 0;
  private depth = 0;
  private readonly tokens: FormulaToken[] = [];

  constructor(
    private readonly args: Readonly<{
      formula: string;
      fields: readonly FormulaField[];
      plan: Plan;
      provider: string;
    }>
  ) {
    if (args.formula.length > 8192) throw new Error('Formula is too long.');
    const pattern =
      /\s*(?:('(?:[^']|'')*')|("(?:[^"]|"")*")|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z_0-9]*)|(<=|>=|<>|!=|[=<>()+*/,-]))/y;
    let offset = 0;
    while (offset < args.formula.length) {
      if (args.formula.slice(offset).trim() === '') break;
      pattern.lastIndex = offset;
      const match = pattern.exec(args.formula);
      if (match == null) throw new Error(`Invalid formula at ${offset + 1}.`);
      offset = pattern.lastIndex;
      this.tokens.push(
        match[1] != null
          ? { kind: 'string', value: match[1].slice(1, -1).replaceAll("''", "'") }
          : match[2] != null
            ? { kind: 'quoted', value: match[2].slice(1, -1).replaceAll('""', '"') }
            : match[3] != null
              ? { kind: 'number', value: match[3] }
              : match[4] != null
                ? { kind: 'name', value: match[4] }
                : { kind: 'symbol', value: match[5]! }
      );
    }
  }

  private take(symbol: string): boolean {
    const token = this.tokens[this.cursor];
    if (token?.kind !== 'symbol' || token.value !== symbol) return false;
    this.cursor += 1;
    return true;
  }

  private word(word: string): boolean {
    const token = this.tokens[this.cursor];
    if (token?.kind !== 'name' || token.value.toUpperCase() !== word) return false;
    this.cursor += 1;
    return true;
  }

  private call(name: string, supplied: readonly FormulaValue[]): FormulaValue {
    const operands = bindFormulaNulls(name, supplied, this.args.provider);
    // The admitted binary CONCAT is associative with ACCEPT_NULLS; no new variadic signature.
    if (name.toLowerCase() === 'concat' && operands.length > 2)
      return operands
        .slice(1)
        .reduce((left, right) => this.call(name, [left, right]), operands[0]!);
    const capability = resolveDvtSubstraitColumnFunctions({
      dataTypes: operands.map((operand) => operand.dataType),
      provider: this.args.provider,
      resolution: 'complete',
    }).find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (capability == null)
      throw new Error(`Unavailable function or incompatible arguments: ${name}.`);
    const expression = buildDvtSubstraitScalarFunction({
      plan: this.args.plan,
      provider: this.args.provider,
      capabilityId: capability.capabilityId,
      dataTypes: operands.map((operand) => operand.dataType),
      operands: operands.map((operand) => operand.expression),
    });
    if (
      expression?.rexType.case !== 'scalarFunction' ||
      expression.rexType.value.outputType == null
    )
      throw new Error(`Unavailable expression: ${name}.`);
    const dataType = derivedOutputDataType(expression.rexType.value.outputType);
    if (dataType == null) throw new Error('Unsupported expression type.');
    return {
      expression,
      dataType,
      fieldIds: [...new Set(operands.flatMap((operand) => operand.fieldIds))],
    };
  }

  private atom(): FormulaValue {
    this.depth += 1;
    if (this.depth > 64) throw new Error('Formula nesting is too deep.');
    try {
      if (this.take('(')) {
        const value = this.disjunction();
        if (!this.take(')')) throw new Error('Expected closing parenthesis.');
        return value;
      }
      const negative = this.take('-');
      const token = this.tokens[this.cursor++];
      if (token == null) throw new Error('Incomplete formula.');
      if (negative && token.kind !== 'number')
        throw new Error('A negative literal requires a number.');
      if (token.kind === 'string')
        return {
          expression: dvtSubstraitExpression.literal({ dataType: 'string', value: token.value }),
          dataType: 'string',
          fieldIds: [],
        };
      if (token.kind === 'number') {
        const text = `${negative ? '-' : ''}${token.value}`;
        if (/[.eE]/.test(text))
          return {
            expression: dvtSubstraitExpression.literal({ dataType: 'fp64', value: Number(text) }),
            dataType: 'double precision',
            fieldIds: [],
          };
        const value = BigInt(text);
        if (value < -(2n ** 63n) || value >= 2n ** 63n)
          throw new Error('Integer literal is outside i64 range.');
        return {
          expression: dvtSubstraitExpression.literal({ dataType: 'i64', value }),
          dataType: 'bigint',
          fieldIds: [],
        };
      }
      if (token.kind !== 'name' && token.kind !== 'quoted')
        throw new Error('Expected a field, constant or function.');
      if (token.kind === 'name' && this.take('(')) {
        if (token.value.toUpperCase() === 'CAST') return this.nullCast();
        if (token.value.toUpperCase() === 'EXTRACT') return this.extractYear();
        const operands: FormulaValue[] = [];
        if (!this.take(')')) {
          do {
            operands.push(this.disjunction());
          } while (this.take(','));
          if (!this.take(')')) throw new Error('Expected closing parenthesis.');
        }
        return this.call(token.value, operands);
      }
      if (token.kind === 'name' && /^(true|false)$/i.test(token.value))
        return {
          expression: dvtSubstraitExpression.literal({
            dataType: 'bool',
            value: token.value.toLowerCase() === 'true',
          }),
          dataType: 'boolean',
          fieldIds: [],
        };
      if (token.kind === 'name' && token.value.toUpperCase() === 'NULL') return formulaNull();
      const fields = this.args.fields.filter((field) => field.name === token.value);
      if (fields.length !== 1)
        throw new TransformDependencyError(
          fields.length === 0
            ? TRANSFORM_DEPENDENCY_REJECTION.unavailable
            : TRANSFORM_DEPENDENCY_REJECTION.ambiguous,
          [token.value]
        );
      return {
        expression: fields[0]!.expression,
        dataType: fields[0]!.dataType,
        fieldIds: [fields[0]!.fieldId],
      };
    } finally {
      this.depth -= 1;
    }
  }

  private nullCast(): FormulaValue {
    for (const word of ['NULL', 'AS']) {
      const token = this.tokens[this.cursor++];
      if (token?.kind !== 'name' || token.value.toUpperCase() !== word)
        throw new Error('Only CAST(NULL AS type) is supported.');
    }
    const token = this.tokens[this.cursor++];
    if (token?.kind !== 'name') throw new Error('Expected a NULL type.');
    let typeName = token.value.toUpperCase();
    if (typeName === 'DOUBLE') {
      const precision = this.tokens[this.cursor++];
      if (precision?.kind !== 'name' || precision.value.toUpperCase() !== 'PRECISION')
        throw new Error('Expected DOUBLE PRECISION.');
      typeName += ' PRECISION';
    }
    if (!this.take(')')) throw new Error('Expected closing parenthesis.');
    return formulaNull(typeName, false);
  }

  private extractYear(): FormulaValue {
    if (!this.word('YEAR') || !this.word('FROM')) throw new Error('EXTRACT requires YEAR FROM.');
    const value = this.sum();
    if (!this.word('AT') || !this.word('TIME') || !this.word('ZONE'))
      throw new Error("EXTRACT requires AT TIME ZONE 'UTC'.");
    const zone = this.tokens[this.cursor++];
    if (zone?.kind !== 'string' || zone.value !== 'UTC' || !this.take(')'))
      throw new Error('Only UTC year extraction is admitted.');
    return this.call('extract year (UTC)', [value]);
  }

  private product(): FormulaValue {
    let value = this.atom();
    while (true) {
      if (this.take('*')) value = this.call('multiply', [value, this.atom()]);
      else if (this.take('/')) value = this.call('divide', [value, this.atom()]);
      else return value;
    }
  }

  private sum(): FormulaValue {
    let value = this.product();
    while (true) {
      if (this.take('+')) value = this.call('add', [value, this.product()]);
      else if (this.take('-')) value = this.call('subtract', [value, this.product()]);
      else return value;
    }
  }

  private comparison(): FormulaValue {
    const left = this.sum();
    if (this.word('IS')) {
      const negated = this.word('NOT');
      if (!this.word('NULL')) throw new Error('Expected NULL after IS or IS NOT.');
      return this.call(negated ? 'is_not_null' : 'is_null', [left]);
    }
    for (const [symbol, name] of [
      ['=', 'equal'],
      ['<>', 'not_equal'],
      ['!=', 'not_equal'],
      ['>', 'gt'],
      ['>=', 'gte'],
      ['<', 'lt'],
      ['<=', 'lte'],
    ]) {
      if (this.take(symbol!)) return this.call(name!, [left, this.sum()]);
    }
    return left;
  }

  private conjunction(): FormulaValue {
    let value = this.comparison();
    while (this.word('AND')) value = this.call('and', [value, this.comparison()]);
    return value;
  }

  private disjunction(): FormulaValue {
    let value = this.conjunction();
    while (this.word('OR')) value = this.call('or', [value, this.conjunction()]);
    return value;
  }

  read(): FormulaValue {
    const value = this.disjunction();
    if (this.cursor !== this.tokens.length) throw new Error('Unexpected formula suffix.');
    return value;
  }
}

export function compileDerivedOutputFormula(
  args: ConstructorParameters<typeof FormulaReader>[0]
): FormulaValue {
  return new FormulaReader(args).read();
}

export function describeDerivedOutputFormula(
  plan: Plan,
  expression: Expression,
  inputNames: readonly string[]
): string | null {
  const ordinal = dvtSubstraitExpression.fieldOrdinal(expression);
  if (ordinal != null) {
    const name = inputNames[ordinal];
    if (name == null) return null;
    return /^[A-Za-z_][A-Za-z_0-9]*$/.test(name) &&
      !/^(true|false|null|and|or|is|not|cast|extract|year|from|at|time|zone)$/i.test(name)
      ? name
      : `"${name.replaceAll('"', '""')}"`;
  }
  const nullType = dvtSubstraitExpression.nullType(expression);
  if (nullType != null) {
    const typeName =
      nullType.kind.case === 'string'
        ? 'TEXT'
        : nullType.kind.case === 'i64'
          ? 'BIGINT'
          : nullType.kind.case === 'fp64'
            ? 'DOUBLE PRECISION'
            : 'BOOLEAN';
    return typeName === 'TEXT' ? 'NULL' : `CAST(NULL AS ${typeName})`;
  }
  const literal = dvtSubstraitExpression.literalValue(expression);
  if (literal != null) {
    if (literal.dataType === 'string') return `'${literal.value.replaceAll("'", "''")}'`;
    if (literal.dataType === 'precisionTimestampTz') return null;
    if (literal.dataType === 'fp64') {
      if (Object.is(literal.value, -0)) return '-0.0';
      const text = String(literal.value);
      return /[.eE]/.test(text) ? text : `${text}.0`;
    }
    return String(literal.value);
  }
  const fn = expression.rexType;
  if (fn.case !== 'scalarFunction') return null;
  const reference = resolveFunctionReference(plan, fn.value.functionReference);
  if (!reference.ok) return null;
  if (
    reference.value.urn === 'extension:io.substrait:functions_datetime' &&
    reference.value.name === 'extract:req_ptstz_str'
  ) {
    const [component, operand, zone] = fn.value.arguments.map((argument) => argument.argType);
    if (
      fn.value.arguments.length !== 3 ||
      component?.case !== 'enum' ||
      component.value !== 'YEAR' ||
      operand?.case !== 'value' ||
      zone?.case !== 'value'
    )
      return null;
    const timezone = dvtSubstraitExpression.literalValue(zone.value);
    const argument = describeDerivedOutputFormula(plan, operand.value, inputNames);
    return timezone?.dataType === 'string' && timezone.value === 'UTC' && argument != null
      ? `EXTRACT(YEAR FROM ${argument} AT TIME ZONE 'UTC')`
      : null;
  }
  const args = fn.value.arguments.map((argument) =>
    argument.argType.case === 'value'
      ? describeDerivedOutputFormula(plan, argument.argType.value, inputNames)
      : null
  );
  if (args.some((argument) => argument == null)) return null;
  const name = reference.value.name.split(':')[0]!;
  const operator =
    name === 'add'
      ? '+'
      : name === 'subtract'
        ? '-'
        : name === 'multiply'
          ? '*'
          : name === 'divide'
            ? '/'
            : undefined;
  return operator != null && args.length === 2
    ? `(${args[0]} ${operator} ${args[1]})`
    : `${name.toUpperCase()}(${args.join(', ')})`;
}

export function validateDerivedOutputFormula(
  args: Readonly<{
    formula: string;
    fields: readonly Omit<FormulaField, 'expression'>[];
    provider: string;
  }>
): boolean {
  return inspectDerivedOutputFormula(args).ok;
}

export function inspectDerivedOutputFormula(
  args: Parameters<typeof validateDerivedOutputFormula>[0]
) {
  try {
    const plan = create(PlanSchema);
    const result = compileDerivedOutputFormula({
      ...args,
      plan,
      fields: args.fields.map((field, ordinal) => ({
        ...field,
        expression: dvtSubstraitExpression.field(ordinal),
      })),
    });
    if (result.expression.rexType.case === 'selection')
      return {
        ok: false as const,
        message: 'Use Output to pass through a field, or compose an expression.',
      };
    return { ok: true as const, ...result, plan };
  } catch (error) {
    return {
      ok: false as const,
      error,
      message: error instanceof Error ? error.message : 'Invalid formula.',
    };
  }
}
