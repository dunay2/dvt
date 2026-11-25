/** Convert a single worksheet query to a named file-owned dbt model. */
import { z } from 'zod';

import { isSha256HexString } from '../../utils/contractPrimitives.js';
import { WorkspaceRelativeProjectRootSchema } from '../planner/CanvasAuthoringAuthorityBinding.v1.js';
import { ExecuteWorkspaceSqlRequestSchema } from '../sql-workspace/SqlWorksheet.v1.js';

export const WorksheetDbtModelRequestSchema = z
  .object({
    canvasId: z.string().trim().min(1).max(256),
    projectRoot: WorkspaceRelativeProjectRootSchema,
    configSha256: z.string().refine(isSha256HexString),
    name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,126}$/),
    sql: ExecuteWorkspaceSqlRequestSchema.shape.sql,
    requestId: z.string().uuid(),
  })
  .strict();
export type WorksheetDbtModelRequest = z.infer<typeof WorksheetDbtModelRequestSchema>;

export const WorksheetDbtModelResultSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('created'),
      path: z.string().min(1),
      contentSha256: z.string().refine(isSha256HexString),
    })
    .strict(),
  z
    .object({
      kind: z.literal('refused'),
      reason: z.enum(['invalid_sql', 'project_unavailable', 'conflict']),
    })
    .strict(),
]);
export type WorksheetDbtModelResult = z.infer<typeof WorksheetDbtModelResultSchema>;
