/**
 * Owned concern: fingerprint an ordered LOCAL schema without introducing another type system.
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Preserve ordinals, duplicate names and exact provider/storage type declarations.
 * @consequence A schema digest detects metadata changes; it does not prove lossless conversion.
 * @version 1.0.0
 */
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

import { localDataOrdinalErrors } from './localDataInvariants.js';
import { LocalDataLabelSchema } from './localDataPrimitives.js';

const TypeDeclarationSchema = LocalDataLabelSchema.refine(
  (value) => value.toLowerCase() !== 'unknown', 'An unknown type is not an admitted type declaration.'
);
export const LocalDataSchemaV1Schema = z.object({
  schemaVersion: z.literal('local-data-schema.v1'),
  columns: z.array(z.object({
    ordinal: z.number().int().nonnegative().max(4095),
    name: z.string().min(1).max(256).refine((value) => !value.includes('\0'), 'NUL is not a column name.'),
    sourceType: TypeDeclarationSchema,
    localType: TypeDeclarationSchema,
    nullable: z.boolean(),
  }).strict()).min(1).max(4096),
}).strict().superRefine((schema, context) => {
  for (const issue of localDataOrdinalErrors(schema.columns)) {
    context.addIssue({ code: 'custom', path: [...issue.path], message: issue.message });
  }
});
export type LocalDataSchemaV1 = z.infer<typeof LocalDataSchemaV1Schema>;

export function createLocalDataSchemaDigestV1(schema: unknown): string {
  return sha256HexUtf8(jcsCanonicalize(LocalDataSchemaV1Schema.parse(schema)));
}
