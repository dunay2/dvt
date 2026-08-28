import { z } from 'zod';

export const PlannerSelectionSchema = z
  .object({
    selectedNodeIds: z.array(z.string().min(1)),
    includeUpstream: z.boolean().optional(),
    includeDownstream: z.boolean().optional(),
  })
  .strict();

export const PlannerObservabilitySchema = z
  .object({
    tags: z.record(z.string(), z.string()).optional(),
    extra: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown())
  .optional();

export type PlannerSelectionSchemaT = z.infer<typeof PlannerSelectionSchema>;
export type PlannerObservabilitySchemaT = z.infer<typeof PlannerObservabilitySchema>;
