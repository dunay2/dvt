/** Ephemeral visual Formula Builder model. Persisted meaning remains canonical Substrait. */
import { create } from '@bufbuild/protobuf';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveFunctionReference,
  type DvtSubstraitColumnFunction,
} from '@dvt/postgres-projection';

import { compileDerivedOutputFormula, type FormulaField } from './canvasDerivedOutputFormula';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import type { DerivedOutputField } from './DerivedOutputOperands';

export type DerivedOutputVisualFormula =
  | Readonly<{ kind: 'field'; fieldId: string }>
  | Readonly<{ kind: 'string-literal'; value: string }>
  | Readonly<{ kind: 'number-literal'; value: string }>
  | Readonly<{ kind: 'boolean-literal'; value: boolean }>
  | Readonly<{
      kind: 'function';
      capabilityId: string;
      arguments: readonly [DerivedOutputVisualFormula, ...DerivedOutputVisualFormula[]];
    }>;

export type DerivedOutputVisualFormulaValidation =
  | Readonly<{ ok: true; formula: string; dataType: string }>
  | Readonly<{ ok: false }>;

const I64_MIN = -(2n ** 63n);
const I64_MAX_EXCLUSIVE = 2n ** 63n;
const OPERATOR_SYMBOLS: Readonly<Record<string, string>> = {
  add: '+',
  subtract: '-',
  multiply: '*',
};

type SupportedScalarCapability = Readonly<{
  entryId: string;
  identity: Readonly<{ sourceKind: 'simple-extension'; urn: string; name: string }>;
}>;

function supportedScalarCapability(capabilityId: string): SupportedScalarCapability | undefined {
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (candidate) => candidate.entryId === capabilityId
  );
  if (
    entry?.kind !== 'standard' ||
    entry.category !== 'scalar-function' ||
    entry.profileStatus !== 'supported-profile' ||
    entry.identity.sourceKind !== 'simple-extension'
  ) {
    return undefined;
  }
  return { entryId: entry.entryId, identity: entry.identity };
}

function formulaFields(fields: readonly DerivedOutputField[]): readonly FormulaField[] {
  return fields.map((field, ordinal) => ({
    ...field,
    expression: dvtSubstraitExpression.field(ordinal),
  }));
}

function formatFieldName(name: string): string {
  return /^[A-Za-z_][A-Za-z_0-9]*$/.test(name) && !/^(true|false)$/i.test(name)
    ? name
    : `"${name.replaceAll('"', '""')}"`;
}

function formatFp64(value: number): string {
  if (Object.is(value, -0)) return '-0.0';
  const text = String(value);
  return /[.eE]/.test(text) ? text : `${text}.0`;
}

function numberDataType(value: string): 'bigint' | 'double precision' | null {
  const text = value.trim();
  if (!/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text)) return null;
  if (/[.eE]/.test(text)) return Number.isFinite(Number(text)) ? 'double precision' : null;
  try {
    const parsed = BigInt(text);
    return parsed >= I64_MIN && parsed < I64_MAX_EXCLUSIVE ? 'bigint' : null;
  } catch {
    return null;
  }
}

function outputType(function_: DvtSubstraitColumnFunction): string | null {
  if (function_.category === 'text') return 'string';
  if (function_.category === 'date-time') return 'bigint';
  const result = function_.invocation?.outputType;
  return result === 'i64' ? 'bigint' : result === 'fp64' ? 'double precision' : null;
}

export function derivedOutputVisualFormulaDataType(
  expression: DerivedOutputVisualFormula,
  fields: readonly DerivedOutputField[],
  provider: string
): string | null {
  if (expression.kind === 'field')
    return fields.find((field) => field.fieldId === expression.fieldId)?.dataType ?? null;
  if (expression.kind === 'string-literal') return 'string';
  if (expression.kind === 'number-literal') return numberDataType(expression.value);
  if (expression.kind === 'boolean-literal') return 'boolean';

  const dataTypes = expression.arguments.map((argument) =>
    derivedOutputVisualFormulaDataType(argument, fields, provider)
  );
  if (dataTypes.some((dataType) => dataType == null)) return null;
  const function_ = resolveDvtSubstraitColumnFunctions({
    dataTypes: dataTypes.filter((dataType): dataType is string => dataType != null),
    provider,
    resolution: 'complete',
  }).find((candidate) => candidate.capabilityId === expression.capabilityId);
  return function_ == null ? null : outputType(function_);
}

export function derivedOutputVisualFormulaCandidates(
  expression: DerivedOutputVisualFormula,
  fields: readonly DerivedOutputField[],
  provider: string
): readonly DvtSubstraitColumnFunction[] {
  const operands =
    expression.kind === 'function' ? expression.arguments : ([expression] as const);
  const dataTypes = operands.map((operand) =>
    derivedOutputVisualFormulaDataType(operand, fields, provider)
  );
  if (dataTypes.some((dataType) => dataType == null)) return [];
  return resolveDvtSubstraitColumnFunctions({
    dataTypes: dataTypes.filter((dataType): dataType is string => dataType != null),
    provider,
    resolution: 'proposal',
  }).filter(
    // The current formula grammar has no component/timezone syntax for temporal functions.
    // Do not expose a visual choice that cannot round-trip through compileDerivedOutputFormula.
    (candidate) => candidate.category !== 'date-time'
  );
}

export function compatibleDerivedOutputVisualFields(args: Readonly<{
  expression: Extract<DerivedOutputVisualFormula, { kind: 'function' }>;
  argumentIndex: number;
  fields: readonly DerivedOutputField[];
  provider: string;
}>): readonly DerivedOutputField[] {
  const compatible = args.fields.filter((field) => {
    const arguments_ = args.expression.arguments.map((argument, index) =>
      index === args.argumentIndex ? ({ kind: 'field', fieldId: field.fieldId } as const) : argument
    );
    const probe: DerivedOutputVisualFormula = {
      kind: 'function',
      capabilityId: args.expression.capabilityId,
      arguments: arguments_ as [
        DerivedOutputVisualFormula,
        ...DerivedOutputVisualFormula[],
      ],
    };
    return derivedOutputVisualFormulaCandidates(probe, args.fields, args.provider).some(
      (candidate) => candidate.capabilityId === args.expression.capabilityId
    );
  });
  return compatible;
}

export function defaultDerivedOutputVisualFormula(
  fields: readonly DerivedOutputField[]
): DerivedOutputVisualFormula {
  return fields[0] == null
    ? { kind: 'string-literal', value: '' }
    : { kind: 'field', fieldId: fields[0].fieldId };
}

export function formatDerivedOutputVisualFormula(
  expression: DerivedOutputVisualFormula,
  fields: readonly DerivedOutputField[]
): string | null {
  if (expression.kind === 'field') {
    const field = fields.find((candidate) => candidate.fieldId === expression.fieldId);
    return field == null ? null : formatFieldName(field.name);
  }
  if (expression.kind === 'string-literal')
    return `'${expression.value.replaceAll("'", "''")}'`;
  if (expression.kind === 'number-literal') return expression.value.trim();
  if (expression.kind === 'boolean-literal') return expression.value ? 'true' : 'false';

  const entry = supportedScalarCapability(expression.capabilityId);
  if (entry == null) return null;
  const arguments_ = expression.arguments.map((argument) =>
    formatDerivedOutputVisualFormula(argument, fields)
  );
  if (arguments_.some((argument) => argument == null)) return null;
  const values = arguments_.filter((argument): argument is string => argument != null);
  const operator = OPERATOR_SYMBOLS[entry.identity.name];
  return operator != null && values.length === 2
    ? `(${values[0]} ${operator} ${values[1]})`
    : `${entry.identity.name.toUpperCase()}(${values.join(', ')})`;
}

function inspectVisualFormula(
  plan: Plan,
  expression: ReturnType<typeof compileDerivedOutputFormula>['expression'],
  fields: readonly DerivedOutputField[]
): DerivedOutputVisualFormula | null {
  const ordinal = dvtSubstraitExpression.fieldOrdinal(expression);
  if (ordinal != null) {
    const field = fields[ordinal];
    return field == null ? null : { kind: 'field', fieldId: field.fieldId };
  }

  const literal = dvtSubstraitExpression.literalValue(expression);
  if (literal != null) {
    if (literal.dataType === 'string') return { kind: 'string-literal', value: literal.value };
    if (literal.dataType === 'i64')
      return { kind: 'number-literal', value: String(literal.value) };
    if (literal.dataType === 'fp64')
      return { kind: 'number-literal', value: formatFp64(literal.value) };
    if (literal.dataType === 'bool') return { kind: 'boolean-literal', value: literal.value };
    return null;
  }

  if (expression.rexType.case !== 'scalarFunction') return null;
  const scalar = expression.rexType.value;
  const identity = resolveFunctionReference(plan, scalar.functionReference);
  if (!identity.ok) return null;
  const functionName = identity.value.name.split(':')[0]!;
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (candidate) =>
      candidate.kind === 'standard' &&
      candidate.category === 'scalar-function' &&
      candidate.profileStatus === 'supported-profile' &&
      candidate.identity.sourceKind === 'simple-extension' &&
      candidate.identity.urn === identity.value.urn &&
      candidate.identity.name === functionName
  );
  if (entry?.kind !== 'standard') return null;
  const arguments_ = scalar.arguments.flatMap((argument) =>
    argument.argType.case === 'value'
      ? [inspectVisualFormula(plan, argument.argType.value, fields)]
      : []
  );
  if (arguments_.length === 0 || arguments_.some((argument) => argument == null)) return null;
  return {
    kind: 'function',
    capabilityId: entry.entryId,
    arguments: arguments_.filter(
      (argument): argument is DerivedOutputVisualFormula => argument != null
    ) as [DerivedOutputVisualFormula, ...DerivedOutputVisualFormula[]],
  };
}

export function parseDerivedOutputVisualFormula(args: Readonly<{
  formula: string;
  fields: readonly DerivedOutputField[];
  provider: string;
}>): DerivedOutputVisualFormula {
  const plan = create(PlanSchema);
  const compiled = compileDerivedOutputFormula({
    formula: args.formula,
    fields: formulaFields(args.fields),
    plan,
    provider: args.provider,
  });
  const inspected = inspectVisualFormula(plan, compiled.expression, args.fields);
  if (inspected == null) throw new Error('Formula cannot be represented by the visual builder.');
  return inspected;
}

export function validateDerivedOutputVisualFormula(args: Readonly<{
  expression: DerivedOutputVisualFormula;
  fields: readonly DerivedOutputField[];
  provider: string;
}>): DerivedOutputVisualFormulaValidation {
  const formula = formatDerivedOutputVisualFormula(args.expression, args.fields);
  if (formula == null) return { ok: false };
  try {
    const compiled = compileDerivedOutputFormula({
      formula,
      fields: formulaFields(args.fields),
      plan: create(PlanSchema),
      provider: args.provider,
    });
    return { ok: true, formula, dataType: compiled.dataType };
  } catch {
    return { ok: false };
  }
}

export function visualFormulaFunctionLabel(capabilityId: string): string {
  return supportedScalarCapability(capabilityId)?.identity.name.toUpperCase() ?? capabilityId;
}
