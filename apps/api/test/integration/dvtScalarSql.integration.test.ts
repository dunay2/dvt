import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  ExpressionSchema,
  FunctionArgumentSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
} from '@dvt/contracts';
import {
  projectSubstraitToPostgresSql,
  projectDvtPostgresOutputSchemaV1,
} from '@dvt/postgres-projection';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env['DVT_PG_URL'];
const documents: unknown[] = JSON.parse(
  readFileSync(
    new URL(
      '../../../../packages/@dvt/postgres-projection/test/fixtures/scalar-documents.json',
      import.meta.url
    ),
    'utf8'
  )
);
describe.skipIf(url == null)('Canonical scalar results on PostgreSQL', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ connectionString: url });
    await client.connect();
  });
  afterAll(async () => {
    await client?.end();
  });
  it('fingerprints physical CTAS nullability without changing a required empty-text expression', async () => {
    const encoded = DvtSubstraitSemanticDocumentV1Schema.parse(documents[1]);
    const document = { plan: decodeDvtSubstraitPlanV1(encoded), sidecar: encoded.sidecar };
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
      throw new Error('Expected Project');
    const project = root.value.input.relType.value;
    const read = project.input?.relType;
    if (read?.case !== 'read' || read.value.readType.case !== 'namedTable')
      throw new Error('Expected Read');
    read.value.readType.value.names = ['pg_temp', 'scalar_items'];
    project.expressions = [
      create(ExpressionSchema, {
        rexType: { case: 'literal', value: { literalType: { case: 'string', value: '' } } },
      }),
    ];
    document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
    await client.query('BEGIN');
    try {
      await client.query('CREATE TEMP TABLE scalar_items (value timestamptz) ON COMMIT DROP');
      await client.query('INSERT INTO scalar_items VALUES (NULL)');
      const { sql, projection } = await projectSubstraitToPostgresSql(document);
      expect(projection.outputs[0]?.nullable).toBe(false);
      await client.query(`CREATE TEMP TABLE scalar_candidate ON COMMIT DROP AS ${sql}`);
      const actual = await client.query(
        "SELECT attnum - 1 AS ordinal, attname AS name, format_type(atttypid, atttypmod) AS type, NOT attnotnull AS nullable FROM pg_attribute WHERE attrelid = to_regclass('pg_temp.scalar_candidate') AND attnum > 0 ORDER BY attnum"
      );
      const physical = projectDvtPostgresOutputSchemaV1(projection.outputs);
      expect(actual.rows).toEqual(
        physical?.columns.map(({ ordinal, name, postgresType, nullable }) => ({
          ordinal,
          name,
          type: postgresType,
          nullable,
        }))
      );
      expect(
        (await client.query({ text: 'SELECT * FROM pg_temp.scalar_candidate', rowMode: 'array' }))
          .rows
      ).toEqual([['']]);
    } finally {
      await client.query('ROLLBACK');
    }
  });
  it.each([
    [',', ['Banana', 'Apple', 'Melon'], 'Banana,Apple,Melon'],
    ['', ['Banana', 'Apple'], 'BananaApple'],
    [null, ['Banana', 'Apple'], null],
    [',', [null, 'Apple', 'Melon'], 'Apple,Melon'],
    [',', ['Apple', null, 'Melon'], 'Apple,Melon'],
    [',', [null, null], ''],
    ['-', ['Áda', '', 'x'], 'Áda--x'],
  ] as const)(
    'executes pinned CONCAT_WS separator %s and values %j',
    async (separator, values, expected) => {
      const encoded = DvtSubstraitSemanticDocumentV1Schema.parse(documents[1]);
      const document = { plan: decodeDvtSubstraitPlanV1(encoded), sidecar: encoded.sidecar };
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
        throw new Error('Expected Project');
      const project = root.value.input.relType.value;
      const read = project.input?.relType;
      if (read?.case !== 'read' || read.value.readType.case !== 'namedTable')
        throw new Error('Expected Read');
      read.value.readType.value.names = ['pg_temp', 'scalar_items'];
      const declaration = document.plan.extensions.find(
        (entry) =>
          entry.mappingType.case === 'extensionFunction' &&
          entry.mappingType.value.functionAnchor === 1
      )!.mappingType;
      if (declaration.case !== 'extensionFunction') throw new Error('Expected function');
      declaration.value.name = 'concat_ws:str_str';
      const type = {
        kind: { case: 'string' as const, value: { nullability: Type_Nullability.NULLABLE } },
      };
      project.expressions = [
        create(ExpressionSchema, {
          rexType: {
            case: 'scalarFunction',
            value: {
              functionReference: 1,
              outputType: type,
              arguments: [separator, ...values].map((value) =>
                create(FunctionArgumentSchema, {
                  argType: {
                    case: 'value',
                    value: {
                      rexType: {
                        case: 'literal',
                        value: {
                          literalType:
                            value == null
                              ? { case: 'null', value: type }
                              : { case: 'string', value },
                        },
                      },
                    },
                  },
                })
              ),
            },
          },
        }),
      ];
      document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
      await client.query('BEGIN');
      try {
        await client.query('CREATE TEMP TABLE scalar_items (value timestamptz) ON COMMIT DROP');
        await client.query('INSERT INTO scalar_items VALUES (NULL)');
        const { sql } = await projectSubstraitToPostgresSql(document);
        expect((await client.query({ text: sql, rowMode: 'array' })).rows).toEqual([[expected]]);
      } finally {
        await client.query('ROLLBACK');
      }
    }
  );
  it.each([
    ['i64', 'bigint', '0'],
    ['fp64', 'double precision', 0],
    ['bool', 'boolean', false],
  ] as const)(
    'executes typed COALESCE on %s and preserves a nullable SQL result',
    async (kind, sqlType, expected) => {
      const encoded = DvtSubstraitSemanticDocumentV1Schema.parse(documents[1]);
      const document = { plan: decodeDvtSubstraitPlanV1(encoded), sidecar: encoded.sidecar };
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
        throw new Error('Expected Project');
      const project = root.value.input.relType.value;
      const read = project.input?.relType;
      if (read?.case !== 'read' || read.value.readType.case !== 'namedTable')
        throw new Error('Expected Read');
      read.value.readType.value.names = ['pg_temp', 'scalar_items'];
      const literal = create(ExpressionSchema, {
        rexType: {
          case: 'literal',
          value: {
            literalType: {
              case: 'null',
              value: { kind: { case: kind, value: { nullability: Type_Nullability.NULLABLE } } },
            },
          },
        },
      });
      const fallback = create(ExpressionSchema, {
        rexType: {
          case: 'literal',
          value: {
            literalType:
              kind === 'i64'
                ? { case: 'i64', value: 0n }
                : kind === 'fp64'
                  ? { case: 'fp64', value: 0 }
                  : { case: 'boolean', value: false },
          },
        },
      });
      project.expressions = [
        create(ExpressionSchema, {
          rexType: {
            case: 'scalarFunction',
            value: {
              functionReference: 4,
              arguments: [literal, fallback].map((value) =>
                create(FunctionArgumentSchema, { argType: { case: 'value', value } })
              ),
              outputType: {
                kind: { case: kind, value: { nullability: Type_Nullability.NULLABLE } },
              },
            },
          },
        }),
      ];
      document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
      await client.query('BEGIN');
      try {
        await client.query('CREATE TEMP TABLE scalar_items (value timestamptz) ON COMMIT DROP');
        await client.query('INSERT INTO scalar_items VALUES (NULL)');
        const { sql, projection } = await projectSubstraitToPostgresSql(document);
        const result = await client.query({ text: sql, rowMode: 'array' });
        const oracle = await client.query({
          text: `SELECT COALESCE(NULL::${sqlType}, $1::${sqlType})`,
          values: [expected],
          rowMode: 'array',
        });
        expect(result.rows).toEqual([[expected]]);
        expect(result.rows).toEqual(oracle.rows);
        expect(result.fields[0]?.dataTypeID).toBe(oracle.fields[0]?.dataTypeID);
        expect(projection.outputs[0]).toMatchObject({ dataType: kind, nullable: true });
      } finally {
        await client.query('ROLLBACK');
      }
    }
  );
  it.each([
    {
      ordinal: 0,
      type: 'text',
      values: [null, ' Ada', '', 'Áda'],
      expected: [
        [null, null, 'fallback'],
        [' Ada!', 'ADA!', ' Ada'],
        ['!', '!', ''],
        ['Áda!', 'ÁDA!', 'Áda'],
      ],
    },
    {
      ordinal: 1,
      type: 'timestamptz',
      values: [null, '2027-01-01T00:30:00+01:00', '2026-12-31T23:30:00-01:00'],
      expected: [[null], ['2026'], ['2027']],
    },
  ])(
    'preserves nulls, argument order and UTC semantics ($type)',
    async ({ ordinal, type, values, expected }) => {
      const encoded = DvtSubstraitSemanticDocumentV1Schema.parse(documents[ordinal]);
      const document = { plan: decodeDvtSubstraitPlanV1(encoded), sidecar: encoded.sidecar };
      // A session-local table avoids touching existing schemas or user data.
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
        throw new Error('Expected Project');
      const read = root.value.input.relType.value.input?.relType;
      if (read?.case !== 'read' || read.value.readType.case !== 'namedTable')
        throw new Error('Expected Read');
      read.value.readType.value.names = ['pg_temp', 'scalar_items'];
      const { encodeDvtSubstraitPlanV1 } = await import('@dvt/contracts');
      document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
      await client.query('BEGIN');
      try {
        await client.query(`CREATE TEMP TABLE scalar_items (value ${type}) ON COMMIT DROP`);
        for (const value of values)
          await client.query('INSERT INTO scalar_items VALUES ($1)', [value]);
        await client.query("SET LOCAL TIME ZONE 'Pacific/Honolulu'");
        const { sql } = await projectSubstraitToPostgresSql(document);
        const result = await client.query({ text: sql, rowMode: 'array' });
        const multiset = (rows: unknown[][]): string[] =>
          rows.map((row) => JSON.stringify(row)).sort();
        expect(multiset(result.rows)).toEqual(multiset(expected));
      } finally {
        await client.query('ROLLBACK');
      }
    }
  );
});
