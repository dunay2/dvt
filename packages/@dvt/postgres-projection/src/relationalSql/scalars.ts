/** Executable SQL bindings use the existing semantic capability catalogue. */
import type { Expression_ScalarFunction } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import { pgString, type PostgresAstNode } from '../postgresAst.js';
import { pgAnd, pgOr, pgComparison, pgNullTest } from '../postgresPredicateAst.js';
import { resolveFunctionReference } from '../substrait-profile/functionReference.js';

import { unsupported } from './scope.js';

type Binding = Readonly<{
  family: string;
  minimum: number;
  maximum?: number;
  input: 'string' | 'bool' | 'comparable';
  output: 'string' | 'bool';
  sql: (args: readonly PostgresAstNode[]) => PostgresAstNode;
}>;
const unary = (name: string): Binding => ({
  family: 'functions_string',
  minimum: 1,
  maximum: 1,
  input: 'string',
  output: 'string',
  sql: (args) => ({
    FuncCall: { funcname: [pgString(name)], args, funcformat: 'COERCE_EXPLICIT_CALL' },
  }),
});
const compare = (operator: '=' | '<>' | '>' | '>=' | '<' | '<='): Binding => ({
  family: 'functions_comparison',
  minimum: 2,
  maximum: 2,
  input: 'comparable',
  output: 'bool',
  sql: (args) => pgComparison(operator, args[0]!, args[1]!),
});
const bindings: Readonly<Record<string, Binding>> = {
  upper: unary('upper'),
  lower: unary('lower'),
  trim: unary('btrim'),
  concat: {
    family: 'functions_string',
    minimum: 2,
    maximum: 2,
    input: 'string',
    output: 'string',
    sql: (args) => ({
      FuncCall: { funcname: [pgString('concat')], args, funcformat: 'COERCE_EXPLICIT_CALL' },
    }),
  },
  coalesce: {
    family: 'functions_comparison',
    minimum: 2,
    input: 'string',
    output: 'string',
    sql: (args) => ({ CoalesceExpr: { args } }),
  },
  equal: compare('='),
  not_equal: compare('<>'),
  gt: compare('>'),
  gte: compare('>='),
  lt: compare('<'),
  lte: compare('<='),
  and: {
    family: 'functions_boolean',
    minimum: 2,
    maximum: 2,
    input: 'bool',
    output: 'bool',
    sql: pgAnd,
  },
  or: {
    family: 'functions_boolean',
    minimum: 2,
    maximum: 2,
    input: 'bool',
    output: 'bool',
    sql: pgOr,
  },
  is_null: {
    family: 'functions_comparison',
    minimum: 1,
    maximum: 1,
    input: 'comparable',
    output: 'bool',
    sql: (args) => pgNullTest(args[0]!, false),
  },
  is_not_null: {
    family: 'functions_comparison',
    minimum: 1,
    maximum: 1,
    input: 'comparable',
    output: 'bool',
    sql: (args) => pgNullTest(args[0]!, true),
  },
};

export function scalarSql(
  plan: Plan,
  fn: Expression_ScalarFunction,
  args: readonly PostgresAstNode[],
  types: readonly Type[]
): PostgresAstNode {
  const reference = resolveFunctionReference(plan, fn.functionReference);
  if (!reference.ok) return unsupported(reference.reason);
  const identity = reference.value;
  const name = identity.name.split(':')[0]!;
  const binding = Object.hasOwn(bindings, name) ? bindings[name]! : undefined;
  const capability = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (entry) =>
      entry.kind === 'standard' &&
      entry.category === 'scalar-function' &&
      entry.profileStatus === 'supported-profile' &&
      entry.identity.sourceKind === 'simple-extension' &&
      entry.identity.urn === identity.urn &&
      entry.identity.name === name
  );
  if (
    binding == null ||
    capability?.kind !== 'standard' ||
    identity.urn !== `extension:io.substrait:${binding.family}`
  )
    return unsupported('Scalar function has no admitted PostgreSQL binding.');
  const signature =
    capability.invocation?.signature ?? (binding.input === 'string' ? `${name}:str` : name);
  const options = capability.invocation?.options ?? [];
  if (
    identity.name !== signature ||
    args.length < binding.minimum ||
    (binding.maximum != null && args.length > binding.maximum) ||
    fn.arguments.some((argument) => argument.argType.case !== 'value') ||
    fn.options.length !== options.length ||
    fn.options.some(
      (option, ordinal) =>
        option.name !== options[ordinal]?.name ||
        option.preference.join() !== options[ordinal]?.preference.join()
    ) ||
    fn.outputType?.kind.case !== binding.output ||
    fn.outputType.kind.value.typeVariationReference !== 0
  )
    return unsupported('Scalar invocation differs from the admitted signature.');
  if (binding.input === 'comparable') {
    const first = types[0]?.kind.case;
    if (
      first == null ||
      !['string', 'i64', 'fp64', 'bool', 'precisionTimestampTz'].includes(first) ||
      types.some((type) => type.kind.case !== first)
    )
      return unsupported('Comparison operands have incompatible types.');
  } else if (types.some((type) => type.kind.case !== binding.input))
    return unsupported('Scalar operands have incompatible types.');
  const required = name === 'is_null' || name === 'is_not_null';
  if (
    fn.outputType.kind.value.nullability !==
    (required ? Type_Nullability.REQUIRED : Type_Nullability.NULLABLE)
  )
    return unsupported('Scalar result nullability differs from the admitted profile.');
  return binding.sql(args);
}
