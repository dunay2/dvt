/** Owns the canonical schema fingerprint expected from one PostgreSQL result. */
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

import { PostgresIdentifierV1Schema } from './CanvasAuthoringFieldPolicy.v1.js';

export const DvtPostgresOutputTypeV1Schema = z.enum([
  'text',
  'boolean',
  'bigint',
  'double precision',
  'timestamp with time zone',
]);

export const DvtPostgresOutputSchemaV1Schema = z
  .object({
    schemaVersion: z.literal('dvt-postgres-output-schema.v1'),
    columns: z
      .array(
        z
          .object({
            ordinal: z.number().int().nonnegative(),
            name: PostgresIdentifierV1Schema,
            postgresType: DvtPostgresOutputTypeV1Schema,
            nullable: z.boolean(),
            defaultExpression: z.null(),
            generatedExpression: z.null(),
            collation: z.null(),
          })
          .strict()
      )
      .min(1),
    constraints: z.tuple([]),
    indexes: z.tuple([]),
  })
  .strict()
  .superRefine((schema, context) => {
    const names = new Set<string>();
    schema.columns.forEach((column, index) => {
      if (column.ordinal !== index) {
        context.addIssue({
          code: 'custom',
          path: ['columns', index, 'ordinal'],
          message: 'Column ordinal must equal its position.',
        });
      }
      if (names.has(column.name)) {
        context.addIssue({
          code: 'custom',
          path: ['columns', index, 'name'],
          message: 'Column names must be unique.',
        });
      }
      names.add(column.name);
    });
  });

export function createDvtPostgresOutputSchemaDigestV1(schema: DvtPostgresOutputSchemaV1): string {
  const canonical = DvtPostgresOutputSchemaV1Schema.parse(schema);
  return sha256HexUtf8(jcsCanonicalize(canonical));
}

export type DvtPostgresOutputTypeV1 = z.infer<typeof DvtPostgresOutputTypeV1Schema>;
export type DvtPostgresOutputSchemaV1 = z.infer<typeof DvtPostgresOutputSchemaV1Schema>;
