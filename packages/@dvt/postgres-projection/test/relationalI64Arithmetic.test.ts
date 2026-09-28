import { create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  type Expression_ScalarFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import {
  PlanSchema,
  type Plan,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_I64Schema,
  Type_Nullability,
  Type_StringSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { pgColumnRef, pgString } from '../src/postgresAst.js';
import { resolveDvtSubstraitColumnFunctions } from '../src/substraitColumnFunctionCatalog.js';
import { scalarSql } from '../src/relationalSql/scalars.js';

const operators = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
} as const;

function arithmetic(name: keyof typeof operators): {
  plan: Plan;
  fn: Expression_ScalarFunction;
} {
  const capability = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (entry) =>
      entry.kind === 'standard' &&
      entry.category === 'scalar-function' &&
      entry.identity.sourceKind === 'simple-extension' &&
      entry.identity.urn === 'extension:io.substrait:functions_arithmetic' &&
      entry.identity.name === name
  );
  if (capability?.kind !== 'standard' || capability.invocation == null)
    throw new Error(`Missing admitted arithmetic capability ${name}.`);

  const plan = create(PlanSchema, {
    extensionUrns: [
      create(SimpleExtensionURNSchema, {
        extensionUrnAnchor: 1,
        urn: 'extension:io.substrait:functions_arithmetic',
      }),
    ],
    extensions: [
      create(SimpleExtensionDeclarationSchema, {
        mappingType: {
          case: 'extensionFunction',
          value: {
            extensionUrnReference: 1,
            functionAnchor: 1,
            name: capability.invocation.signature,
          },
        },
      }),
    ],
  });
  const value = create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: {
        functionReference: 1,
        arguments: [
          { argType: { case: 'value', value: create(ExpressionSchema) } },
          { argType: { case: 'value', value: create(ExpressionSchema) } },
        ],
        options: capability.invocation.options.map((option) => ({
          name: option.name,
          preference: [...option.preference],
        })),
        outputType: create(TypeSchema, {
          kind: {
            case: 'i64',
            value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
          },
        }),
      },
    },
  });
  if (value.rexType.case !== 'scalarFunction') throw new Error('Expected scalar function.');
  return { plan, fn: value.rexType.value };
}

describe('bounded i64 arithmetic target binding', () => {
  it.each(Object.entries(operators))('lowers %s to PostgreSQL %s', (name, operator) => {
    const { plan, fn } = arithmetic(name as keyof typeof operators);
    const i64 = create(TypeSchema, {
      kind: {
        case: 'i64',
        value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
      },
    });
    expect(
      scalarSql(
        plan,
        fn,
        [pgColumnRef('left_value'), pgColumnRef('right_value')],
        [i64, i64]
      )
    ).toEqual({
      A_Expr: {
        kind: 'AEXPR_OP',
        name: [pgString(operator)],
        lexpr: pgColumnRef('left_value'),
        rexpr: pgColumnRef('right_value'),
        location: -1,
      },
    });
  });

  it('projects arithmetic only for complete homogeneous i64 operands on PostgreSQL', () => {
    expect(
      resolveDvtSubstraitColumnFunctions({
        dataTypes: ['bigint', 'bigint'],
        provider: 'postgres',
        resolution: 'complete',
      })
        .filter((entry) => entry.category === 'arithmetic')
        .map((entry) => entry.name)
        .sort()
    ).toEqual(['add', 'divide', 'multiply', 'subtract']);
    expect(
      resolveDvtSubstraitColumnFunctions({
        dataTypes: ['bigint', 'string'],
        provider: 'postgres',
        resolution: 'complete',
      }).filter((entry) => entry.category === 'arithmetic')
    ).toEqual([]);
    expect(
      resolveDvtSubstraitColumnFunctions({
        dataTypes: ['bigint', 'bigint'],
        provider: 'snowflake',
        resolution: 'complete',
      })
    ).toEqual([]);
  });

  it('rejects a forged string invocation before lowering', () => {
    const { plan, fn } = arithmetic('add');
    const string = create(TypeSchema, {
      kind: {
        case: 'string',
        value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
      },
    });
    expect(() =>
      scalarSql(
        plan,
        fn,
        [pgColumnRef('left_value'), pgColumnRef('right_value')],
        [string, string]
      )
    ).toThrow();
  });
});
