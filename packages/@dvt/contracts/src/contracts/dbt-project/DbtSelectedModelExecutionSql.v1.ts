/** Read-only file Model SQL and its assigned publication signature; never a persisted Model mutation. */
import { z } from 'zod';

import { ModelSqlDigestSchema, MODEL_SQL_MAX_LENGTH } from '../canvas/ModelSqlContext.v1.js';
import { WorkspaceDbtModelReferenceSchema } from '../planner/WorkspaceDbtModelReference.v1.js';

export const DbtSelectedModelExecutionSqlSelectionSchema = z
  .object({
    expectedProjectRevision: ModelSqlDigestSchema.optional(),
  })
  .strict();

export const DbtSelectedModelExecutionSqlSchema = z
  .object({
    schemaVersion: z.literal('dbt-selected-model-execution-sql.v1'),
    reference: WorkspaceDbtModelReferenceSchema,
    projectRevisionSha256: ModelSqlDigestSchema,
    analysisSha256: ModelSqlDigestSchema,
    sqlSha256: ModelSqlDigestSchema,
    sql: z.string().min(1).max(MODEL_SQL_MAX_LENGTH),
  })
  .strict();

export type DbtSelectedModelExecutionSqlSelection = z.infer<
  typeof DbtSelectedModelExecutionSqlSelectionSchema
>;
export type DbtSelectedModelExecutionSql = z.infer<typeof DbtSelectedModelExecutionSqlSchema>;
