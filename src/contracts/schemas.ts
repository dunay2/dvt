import { z } from 'zod';

export const WorkflowSnapshotSchema = z.object({
  runId: z.string().uuid(),
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  state: z.enum(['INITIALIZING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']),
  steps: z.record(z.string(), z.enum(['NOT_STARTED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED'])),
  stepOutputs: z.record(z.string(), z.unknown()),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const WorkflowEventSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
  data: z.unknown(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const IdempotencyKeySchema = z.string().min(32).regex(/^[a-f0-9]{32,}$/);
