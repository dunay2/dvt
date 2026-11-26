/**
 * Read-only file Model SQL and its assigned publication signature.
 * @baseline ADR-0060: Native dbt project files remain the Model authoring authority.
 * @decision Publish selected-model SQL with exact project, analysis and SQL digests.
 * @consequence Reading executable SQL does not persist or replace a Model definition.
 * @version 1.0.0
 */
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
