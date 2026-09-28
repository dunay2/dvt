import { ExpressionSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { pgFp64Literal, pgI64Literal } from '../src/postgresPredicateAst.js';
import { projectSubstraitToPostgresSql } from '../src/relationalSql/project.js';

import { scalarFixture } from './relationalScalarFixture.js';

function arithmetic(name: string, type: 'i64' | 'fp64'): ReturnType<typeof scalarFixture> {
  const { document, fn } = scalarFixture(true);
  document.plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === 3)!.urn =
    'extension:io.substrait:functions_arithmetic';
  const declaration = document.plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' && entry.mappingType.value.functionAnchor === 5
  )!.mappingType;
  if (declaration.case !== 'extensionFunction') throw new Error('Expected function.');
  declaration.value.name = `${name}:${type}_${type}`;
  fn.arguments = [2, 3].map((number) => ({
    $typeName: 'substrait.FunctionArgument' as const,
    argType: {
      case: 'value' as const,
      value: create(ExpressionSchema, {
        rexType: {
          case: 'literal',
          value: {
            literalType:
              type === 'i64'
                ? { case: 'i64', value: BigInt(number) }
                : { case: 'fp64', value: number },
          },
        },
      }),
    },
  }));
  fn.outputType = create(TypeSchema, {
    kind:
      type === 'i64'
        ? { case: 'i64', value: { nullability: Type_Nullability.NULLABLE } }
        : { case: 'fp64', value: { nullability: Type_Nullability.NULLABLE } },
  });
  fn.options = [
    {
      $typeName: 'substrait.FunctionOption',
      name: type === 'i64' ? 'overflow' : 'rounding',
      preference: [type === 'i64' ? 'ERROR' : 'TIE_TO_EVEN'],
    },
  ];
  document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
  return { document, fn };
}

describe('arithmetic PostgreSQL projection', () => {
  it('retains the declared type and negative zero for standalone numeric constants', () => {
    expect(pgI64Literal(2n)).toMatchObject({
      TypeCast: { typeName: { names: [{ String: { sval: 'bigint' } }] } },
    });
    expect(pgFp64Literal(2.5)).toMatchObject({
      TypeCast: { typeName: { names: [{ String: { sval: 'float8' } }] } },
    });
    expect(pgFp64Literal(-0)).toMatchObject({
      TypeCast: { arg: { A_Const: { sval: { sval: '-0' } } } },
    });
  });
  for (const type of ['i64', 'fp64'] as const) {
    it.each([
      ['add', '+'],
      ['subtract', '-'],
      ['multiply', '*'],
    ])(`projects exact ${type} overloads for %s`, async (name, operator) => {
      const { document } = arithmetic(name!, type);
      const before = globalThis.structuredClone(document);
      const result = await projectSubstraitToPostgresSql(document);
      expect(result.sql).toContain(operator);
      expect(result.projection.outputs).toMatchObject([{ dataType: type }]);
      expect(document).toEqual(before);
    });
  }
  it.each(['arity', 'type', 'option', 'output'] as const)(
    'rejects invalid %s without emitting SQL',
    async (fault) => {
      const { document, fn } = arithmetic('multiply', 'i64');
      if (fault === 'arity') fn.arguments.pop();
      if (fault === 'type')
        fn.arguments[0]!.argType = {
          case: 'value',
          value: create(ExpressionSchema, {
            rexType: { case: 'literal', value: { literalType: { case: 'string', value: '2' } } },
          }),
        };
      if (fault === 'option') fn.options[0]!.preference = ['SILENT'];
      if (fault === 'output')
        fn.outputType = create(TypeSchema, {
          kind: { case: 'fp64', value: { nullability: Type_Nullability.NULLABLE } },
        });
      document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
      await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});
