/**
 * Owned concern: describe the revision-bound logical SQL namespace of one Model.
 * @baseline ADR-0064 / GH-3944: names expose inputs, never physical lookup authority.
 * @decision Preserve unknown publication facts and honest empty editor state.
 */
import { z } from 'zod';

import { isSha256HexString } from '../../utils/contractPrimitives.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

export const MODEL_SQL_MAX_LENGTH = 65_536;
export const ModelSqlIdentitySchema = z
  .string()
  .min(1)
  .refine((value) => value === value.trim(), 'Identity cannot contain exterior whitespace.');
export const ModelSqlDigestSchema = z.string().refine(isSha256HexString);
export const ModelSqlBufferSchema = z.string().max(MODEL_SQL_MAX_LENGTH);
export const ModelSqlTargetSchema = z
  .object({ canvasId: ModelSqlIdentitySchema, transformNodeId: ModelSqlIdentitySchema })
  .strict();

export const ModelSqlDiagnosticSchema = z
  .object({
    code: z.enum([
      'syntax_error',
      'unsupported_sql',
      'unknown_input',
      'ambiguous_reference',
      'unknown_column',
      'unknown_type',
      'stale_context',
      'input_unavailable',
      'model_unavailable',
      'invalid_model',
    ]),
    source: z.enum(['parser', 'binding', 'semantic']),
    message: z.string().min(1),
    startOffset: z.number().int().nonnegative().optional(),
    endOffset: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.endOffset === undefined ||
      (value.startOffset !== undefined && value.endOffset >= value.startOffset),
    { message: 'Diagnostic offsets must describe an ordered range.' }
  );

export const ModelSqlColumnSchema = z
  .object({
    id: ModelSqlIdentitySchema,
    name: z.string().min(1),
    dataType: z.string().min(1).nullable(),
    nullable: z.boolean().nullable(),
  })
  .strict();

export const ModelSqlInputSchema = z
  .object({
    nodeId: ModelSqlIdentitySchema,
    name: z.string().min(1),
    sqlName: z.string().min(1),
    columns: z.array(ModelSqlColumnSchema).max(512),
  })
  .strict()
  .refine(
    (input) =>
      new Set(input.columns.map((column) => column.id)).size === input.columns.length &&
      new Set(input.columns.map((column) => column.name)).size === input.columns.length,
    { message: 'An SQL input requires unambiguous column identities and names.' }
  );

export const ModelSqlContextResponseSchema = ModelSqlTargetSchema.extend({
  schemaVersion: z.literal('canvas-model-sql-context.v1'),
  draftRevision: ModelSqlIdentitySchema,
  contextSha256: ModelSqlDigestSchema,
  semanticPlanSha256: ModelSqlDigestSchema.nullable(),
  connectionRef: ConnectionRefSchema.nullable(),
  sql: ModelSqlBufferSchema.nullable(),
  inputs: z.array(ModelSqlInputSchema).max(128),
  diagnostics: z.array(ModelSqlDiagnosticSchema).max(128),
})
  .strict()
  .refine(
    (context) =>
      new Set(context.inputs.map((input) => input.sqlName)).size === context.inputs.length,
    {
      message: 'Logical SQL input names must be unambiguous.',
    }
  );

export type ModelSqlTarget = z.infer<typeof ModelSqlTargetSchema>;
export type ModelSqlDiagnostic = z.infer<typeof ModelSqlDiagnosticSchema>;
export type ModelSqlColumn = z.infer<typeof ModelSqlColumnSchema>;
export type ModelSqlInput = z.infer<typeof ModelSqlInputSchema>;
export type ModelSqlContextResponse = z.infer<typeof ModelSqlContextResponseSchema>;
