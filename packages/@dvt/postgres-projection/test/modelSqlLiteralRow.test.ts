/** Compile genuine source-free Models without inventing physical or producer authority. */
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { toJson } from '@bufbuild/protobuf';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { pgColumnRef, pgRangeSubselect, pgRangeVar, pgStringLiteral } from '../src/postgresAst.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import { firstRead, sqlSelect, sqlTarget } from './modelSqlSource.fixture.js';

describe('Model SQL source-free literal row', () => {
  it('compiles SELECT 1 AS comprobacion_editor_sql to one typed virtual Read', () => {
    const { document, inputAdditions } = compileModelSqlSource(
      sqlSelect([sqlTarget({ A_Const: { ival: { ival: 1 } } }, 'comprobacion_editor_sql')], []),
      { inputs: [] }
    );
    const read = firstRead(document);
    expect(document.plan.relations[0]?.relType).toMatchObject({
      case: 'root',
      value: { names: ['comprobacion_editor_sql'], input: read.relation },
    });
    expect(read.relation.relType).toMatchObject({
      case: 'read',
      value: {
        baseSchema: {
          names: ['comprobacion_editor_sql'],
          struct: {
            nullability: Type_Nullability.REQUIRED,
            types: [{ kind: { case: 'i32', value: { nullability: Type_Nullability.REQUIRED } } }],
          },
        },
        readType: {
          case: 'virtualTable',
          value: {
            expressions: [
              {
                fields: [
                  {
                    rexType: {
                      case: 'literal',
                      value: { literalType: { case: 'i32', value: 1 }, nullable: false },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    });
    expect(read.inputs).toEqual([]);
    expect(document.sidecar.relations).toHaveLength(1);
    expect(read.binding).not.toHaveProperty('sourceRef');
    expect(read.binding).not.toHaveProperty('producerRef');
    expect(read.fields).toMatchObject([
      { displayName: 'comprobacion_editor_sql', outputOrdinal: 0 },
    ]);
    expect(read.fields[0]).not.toHaveProperty('sourceFieldId');
    expect(inputAdditions).toEqual([]);
  });

  it.each([
    [{ ival: {} }, 'i32', 0],
    [{ ival: { ival: -2147483648 } }, 'i32', -2147483648],
    [{ ival: { ival: 2147483647 } }, 'i32', 2147483647],
    [{ boolval: { boolval: true } }, 'boolean', true],
    [{ boolval: {} }, 'boolean', false],
    [{ sval: { sval: "quoted ' text" } }, 'string', "quoted ' text"],
    [{ sval: {} }, 'string', ''],
  ] as const)(
    'preserves literal defaults, values and required types: %j',
    (constant, kind, value) => {
      const { document } = compileModelSqlSource(
        sqlSelect([sqlTarget({ A_Const: constant }, 'value')], []),
        { inputs: [] }
      );
      const read = firstRead(document).relation.relType;
      if (read.case !== 'read') throw new Error('Expected the literal Read.');
      expect(read.value.readType).toMatchObject({
        case: 'virtualTable',
        value: {
          expressions: [
            {
              fields: [
                {
                  rexType: {
                    case: 'literal',
                    value: { literalType: { case: kind, value }, nullable: false },
                  },
                },
              ],
            },
          ],
        },
      });
      const analysis = deriveSubstraitSchemas(document);
      const type = analysis.schemas.get(analysis.index.rootId)?.[0]?.type;
      expect(type?.kind).toMatchObject({
        case: kind === 'boolean' ? 'bool' : kind,
        value: { nullability: Type_Nullability.REQUIRED },
      });
    }
  );

  it('keeps explicit aliases and heterogeneous columns in exactly one row', () => {
    const { document, inputAdditions } = compileModelSqlSource(
      sqlSelect(
        [
          sqlTarget({ A_Const: { ival: { ival: 1 } } }, 'number'),
          sqlTarget({ A_Const: { boolval: { boolval: true } } }, 'flag'),
          sqlTarget(pgStringLiteral('hello'), 'quoted alias'),
        ],
        []
      ),
      { inputs: [] }
    );
    const read = firstRead(document).relation.relType;
    if (read.case !== 'read' || read.value.readType.case !== 'virtualTable')
      throw new Error('Expected a virtual table.');
    expect(read.value.baseSchema?.names).toEqual(['number', 'flag', 'quoted alias']);
    expect(read.value.readType.value.expressions).toHaveLength(1);
    expect(read.value.readType.value.expressions[0]?.fields).toHaveLength(3);
    expect(document.sidecar.relations).toHaveLength(1);
    expect(inputAdditions).toEqual([]);
  });

  it('recompiles a retained constant document without changing its authority', () => {
    const ast = sqlSelect([sqlTarget(pgStringLiteral('same'), 'value')], []);
    const first = compileModelSqlSource(ast, { inputs: [] }).document;
    const beforePlan = toJson(PlanSchema, first.plan);
    const beforeSidecar = globalThis.structuredClone(first.sidecar);
    const next = compileModelSqlSource(ast, { inputs: [], currentDocument: first });
    expect(toJson(PlanSchema, next.document.plan)).toEqual(beforePlan);
    expect(toJson(PlanSchema, first.plan)).toEqual(beforePlan);
    expect(first.sidecar).toEqual(beforeSidecar);
    expect(next.inputAdditions).toEqual([]);
  });

  it.each([
    pgColumnRef('unknown'),
    { ParamRef: { number: 1 } },
    { FuncCall: { funcname: [{ String: { sval: 'now' } }] } },
    {
      TypeCast: { arg: pgStringLiteral('1'), typeName: { names: [{ String: { sval: 'int4' } }] } },
    },
    {
      A_Expr: {
        name: [{ String: { sval: '+' } }],
        lexpr: { A_Const: { ival: { ival: 1 } } },
        rexpr: { A_Const: { ival: { ival: 2 } } },
      },
    },
    { A_Const: { isnull: true } },
    { A_Const: { fval: { fval: '1.5' } } },
    { A_Const: { ival: { ival: 2147483648 } } },
    { A_Const: { ival: { ival: -2147483649 } } },
    { A_Const: { ival: { ival: 1.5 } } },
    { A_Const: { boolval: { boolval: 'true' } } },
    { A_Const: { sval: { sval: 1 } } },
    { A_Const: { ival: { ival: null } } },
    { A_Const: { boolval: { boolval: null } } },
    { A_Const: { sval: { sval: null } } },
    { A_Const: { ival: { ival: 1 }, isnull: null } },
    { A_Const: { ival: { ival: 1 }, boolval: { boolval: true } } },
  ])(
    'rejects unsupported or contradictory literals without a partial document: %j',
    (expression) => {
      expect(() =>
        compileModelSqlSource(sqlSelect([sqlTarget(expression, 'value')], []), { inputs: [] })
      ).toThrow();
    }
  );

  it.each([
    { whereClause: { A_Const: { boolval: { boolval: true } } } },
    { sortClause: [{ SortBy: { node: pgColumnRef('value') } }] },
    { limitCount: { A_Const: { ival: { ival: 1 } } }, limitOption: 'LIMIT_OPTION_COUNT' },
    { limitOffset: { A_Const: { ival: {} } } },
    { distinctClause: [{}] },
    { groupClause: [pgColumnRef('value')] },
  ])('rejects clauses outside the single-row profile: %j', (clauses) => {
    expect(() =>
      compileModelSqlSource(
        sqlSelect([sqlTarget({ A_Const: { ival: { ival: 1 } } }, 'value')], [], clauses),
        { inputs: [] }
      )
    ).toThrow();
  });

  it('requires nonempty unique explicit aliases and the existing output bound', () => {
    const value = { A_Const: { ival: { ival: 1 } } };
    for (const targets of [
      [],
      [sqlTarget(value)],
      [sqlTarget(value, '')],
      [sqlTarget(value, 'same'), sqlTarget(value, 'same')],
      Array.from({ length: 513 }, (_, index) => sqlTarget(value, `field_${index}`)),
    ])
      expect(() => compileModelSqlSource(sqlSelect(targets, []), { inputs: [] })).toThrow();
  });

  it('retains the denial of unbound physical and nested source-free reads', () => {
    expect(() =>
      compileModelSqlSource(
        sqlSelect([sqlTarget(pgColumnRef('field'), 'field')], [pgRangeVar({ table: 'unbound' })]),
        { inputs: [] }
      )
    ).toThrow(expect.objectContaining({ code: 'unknown_input' }));
    const inner = sqlSelect([sqlTarget({ A_Const: { ival: { ival: 1 } } }, 'value')], []);
    expect(() =>
      compileModelSqlSource(
        sqlSelect([sqlTarget(pgColumnRef('value'), 'value')], [pgRangeSubselect(inner, 'nested')]),
        { inputs: [] }
      )
    ).toThrow();
  });
});
