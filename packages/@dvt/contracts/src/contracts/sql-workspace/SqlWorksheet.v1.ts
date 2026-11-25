/** Published language for independent SQL execution and immutable completed query history. */
import { z } from 'zod';

import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';
import { SourceObjectColumnSchema } from '../source-import/SourceObjectCatalog.js';

export const WORKSPACE_SQL_DEFAULT_LIMIT = 100;
export const WORKSPACE_SQL_MAX_LIMIT = 1000;
export const WORKSPACE_SQL_MAX_LENGTH = 65_536;
export const WORKSPACE_SQL_HISTORY_DEFAULT_LIMIT = 20;
export const WORKSPACE_SQL_HISTORY_MAX_LIMIT = 100;

export const WorkspaceSqlExecutionIdSchema = z
  .string()
  .regex(/^\d{13}-[a-f0-9]{32}-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u);

const NonBlankStringSchema = z.string().trim().min(1);
const SqlTextSchema = z
  .string()
  .max(WORKSPACE_SQL_MAX_LENGTH)
  .refine((sql) => sql.trim().length > 0, 'SQL is required.');
const RowLimitSchema = z.number().int().positive().max(WORKSPACE_SQL_MAX_LIMIT);
const ColumnsSchema = z.array(SourceObjectColumnSchema);

export const ExecuteWorkspaceSqlRequestSchema = z
  .object({
    connectionId: ConnectionRefSchema.shape.connectionId,
    sql: SqlTextSchema,
    limit: RowLimitSchema.default(WORKSPACE_SQL_DEFAULT_LIMIT),
  })
  .strict();

export const WorkspaceSqlDiagnosticSchema = z
  .object({
    message: NonBlankStringSchema,
    startOffset: z.number().int().nonnegative().optional(),
    endOffset: z.number().int().nonnegative().optional(),
  })
  .strict();

export const WorkspaceSqlFailureSchema = z
  .object({
    code: z.enum([
      'sql_invalid',
      'provider_unsupported',
      'connection_unavailable',
      'query_timeout',
      'query_failed',
    ]),
    message: NonBlankStringSchema,
    diagnostics: z.array(WorkspaceSqlDiagnosticSchema).max(50).optional(),
  })
  .strict();

const ExecutionFields = {
  schemaVersion: z.literal('workspace-sql-execution.v1'),
  executionId: WorkspaceSqlExecutionIdSchema,
  sql: SqlTextSchema,
  connectionRef: ConnectionRefSchema,
  connectionName: NonBlankStringSchema,
  principalId: NonBlankStringSchema,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  durationMs: z.number().finite().nonnegative(),
  limit: RowLimitSchema,
};

export const WorkspaceSqlExecutionSchema = z
  .discriminatedUnion('status', [
    z
      .object({
        ...ExecutionFields,
        status: z.literal('succeeded'),
        rowCount: z.number().int().nonnegative(),
        truncated: z.boolean(),
        columns: ColumnsSchema,
      })
      .strict(),
    z
      .object({
        ...ExecutionFields,
        status: z.literal('failed'),
        rowCount: z.literal(0),
        truncated: z.literal(false),
        columns: z.tuple([]),
        error: WorkspaceSqlFailureSchema,
      })
      .strict(),
  ])
  .superRefine((execution, context) => {
    if (Date.parse(execution.finishedAt) < Date.parse(execution.startedAt))
      context.addIssue({
        code: 'custom',
        path: ['finishedAt'],
        message: 'Execution ends before it starts.',
      });
    if (execution.rowCount > execution.limit)
      context.addIssue({
        code: 'custom',
        path: ['rowCount'],
        message: 'Rows exceed the admitted limit.',
      });
  });

export const WorkspaceSqlResultSchema = z
  .object({
    columns: ColumnsSchema,
    rows: z
      .array(z.object({ values: z.array(z.string().nullable()) }).strict())
      .max(WORKSPACE_SQL_MAX_LIMIT),
  })
  .strict()
  .superRefine((result, context) => {
    result.rows.forEach((row, index) => {
      if (row.values.length !== result.columns.length)
        context.addIssue({
          code: 'custom',
          path: ['rows', index],
          message: 'Row width does not match its columns.',
        });
    });
  });

export const ExecuteWorkspaceSqlResponseSchema = z
  .object({
    schemaVersion: z.literal('workspace-sql-execution-response.v1'),
    execution: WorkspaceSqlExecutionSchema,
    result: WorkspaceSqlResultSchema.optional(),
  })
  .strict()
  .superRefine((response, context) => {
    if (response.execution.status === 'failed') {
      if (response.result !== undefined)
        context.addIssue({
          code: 'custom',
          path: ['result'],
          message: 'Failed executions cannot publish rows.',
        });
      return;
    }
    if (
      response.result === undefined ||
      response.result.rows.length !== response.execution.rowCount ||
      JSON.stringify(response.result.columns) !== JSON.stringify(response.execution.columns)
    )
      context.addIssue({
        code: 'custom',
        path: ['result'],
        message: 'Result does not match the completed execution facts.',
      });
  });

export const ListWorkspaceSqlExecutionsRequestSchema = z
  .object({
    limit: z
      .number()
      .int()
      .positive()
      .max(WORKSPACE_SQL_HISTORY_MAX_LIMIT)
      .default(WORKSPACE_SQL_HISTORY_DEFAULT_LIMIT),
    cursor: z.string().min(1).max(4096).optional(),
    connectionId: ConnectionRefSchema.shape.connectionId.optional(),
  })
  .strict();

export const ListWorkspaceSqlExecutionsResponseSchema = z
  .object({
    schemaVersion: z.literal('workspace-sql-execution-history.v1'),
    executions: z.array(WorkspaceSqlExecutionSchema).max(WORKSPACE_SQL_HISTORY_MAX_LIMIT),
    nextCursor: z.string().min(1).max(4096).nullable(),
  })
  .strict();

export const GetWorkspaceSqlExecutionResponseSchema = z
  .object({
    schemaVersion: z.literal('workspace-sql-execution-detail.v1'),
    execution: WorkspaceSqlExecutionSchema,
  })
  .strict();

export type ExecuteWorkspaceSqlRequest = z.infer<typeof ExecuteWorkspaceSqlRequestSchema>;
export type ExecuteWorkspaceSqlResponse = z.infer<typeof ExecuteWorkspaceSqlResponseSchema>;
export type WorkspaceSqlExecution = z.infer<typeof WorkspaceSqlExecutionSchema>;
export type WorkspaceSqlResult = z.infer<typeof WorkspaceSqlResultSchema>;
export type WorkspaceSqlFailure = z.infer<typeof WorkspaceSqlFailureSchema>;
export type ListWorkspaceSqlExecutionsRequest = z.infer<
  typeof ListWorkspaceSqlExecutionsRequestSchema
>;
export type ListWorkspaceSqlExecutionsResponse = z.infer<
  typeof ListWorkspaceSqlExecutionsResponseSchema
>;
export type GetWorkspaceSqlExecutionResponse = z.infer<
  typeof GetWorkspaceSqlExecutionResponseSchema
>;
