import { z } from 'zod';

import {
  RunEventRecordSchema,
  type RunEventRecordSchemaT,
  RunEventWriteSchema,
  type RunEventWriteSchemaT,
} from '../schemas.js';

import { parseWithSchema } from './core.js';

const LegacyCanonicalEngineEventSchema = z.object({
  runId: z.string().min(1),
  runSeq: z.number().int().positive().optional(),
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  eventData: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(1),
  emittedAt: z.string().min(1),
});

export type LegacyCanonicalEngineEvent = z.infer<typeof LegacyCanonicalEngineEventSchema>;

export function parseRunEventWrite(input: unknown): RunEventWriteSchemaT {
  return parseWithSchema(RunEventWriteSchema, input);
}

export function parseCanonicalEngineEvent(input: unknown): LegacyCanonicalEngineEvent {
  return parseWithSchema(LegacyCanonicalEngineEventSchema, input);
}

export function parseRunEventRecord(input: unknown): RunEventRecordSchemaT {
  return parseWithSchema(RunEventRecordSchema, input);
}
