/**
 * Owned concern: exchange a source proposal and complete canonical compilation or diagnostics.
 * @baseline ADR-0064 / GH-3944: compilation confers no graph write or execution authority.
 * @decision Invalid results carry no partial semantic candidate.
 */
import { z } from 'zod';

import { DvtSubstraitSemanticDocumentV1Schema } from '../planner/DvtSubstraitSemanticDocument.v1.js';

import {
  ModelSqlBufferSchema,
  ModelSqlColumnSchema,
  ModelSqlDiagnosticSchema,
  ModelSqlDigestSchema,
  ModelSqlIdentitySchema,
  ModelSqlTargetSchema,
} from './ModelSqlContext.v1.js';

export { MODEL_SQL_MAX_LENGTH } from './ModelSqlContext.v1.js';

export const ModelSqlCompilationRequestSchema = ModelSqlTargetSchema.extend({
  draftRevision: ModelSqlIdentitySchema,
  contextSha256: ModelSqlDigestSchema,
  sql: ModelSqlBufferSchema,
}).strict();

const CompilationIdentitySchema = ModelSqlTargetSchema.extend({
  schemaVersion: z.literal('canvas-model-sql-compilation.v1'),
  draftRevision: ModelSqlIdentitySchema,
  contextSha256: ModelSqlDigestSchema,
  sqlSha256: ModelSqlDigestSchema,
});

export const ModelSqlInputAdditionSchema = z
  .object({ nodeId: ModelSqlIdentitySchema, columnId: ModelSqlIdentitySchema })
  .strict();

export const ModelSqlCompilationResponseSchema = z.discriminatedUnion('status', [
  CompilationIdentitySchema.extend({
    status: z.literal('valid'),
    normalizedSql: ModelSqlBufferSchema,
    semanticDocument: DvtSubstraitSemanticDocumentV1Schema,
    columns: z.array(ModelSqlColumnSchema).max(512),
    inputAdditions: z.array(ModelSqlInputAdditionSchema).max(4096),
    diagnostics: z.array(ModelSqlDiagnosticSchema).max(0),
  }).strict(),
  CompilationIdentitySchema.extend({
    status: z.literal('invalid'),
    diagnostics: z.array(ModelSqlDiagnosticSchema).min(1).max(128),
  }).strict(),
]);

export type ModelSqlCompilationRequest = z.infer<typeof ModelSqlCompilationRequestSchema>;
export type ModelSqlCompilationResponse = z.infer<typeof ModelSqlCompilationResponseSchema>;
export type ModelSqlInputAddition = z.infer<typeof ModelSqlInputAdditionSchema>;
