import { z } from 'zod';

import { ExecutionSelectionSchema } from '../contracts/planner/ExecutionSelection.v1.js';
import { PlanPreviewProvenanceSchema } from '../contracts/planner/PlanPreviewProvenance.v1.js';

import { NonBlankStringSchema, RunContextSchema } from './common.js';
import { PreviewProfileSchema } from './plan-preview-profile.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

export const PlanPreviewRequestSchema = z
  .object({
    previewProfile: PreviewProfileSchema,
    context: RunContextSchema,
    selection: ExecutionSelectionSchema,
    graphSource: GenericGraphSourceV1Schema,
    planName: NonBlankStringSchema.optional(),
    provenance: PlanPreviewProvenanceSchema.optional(),
    persist: z.literal(true),
  })
  .strict();

export type PlanPreviewRequestSchemaT = z.infer<typeof PlanPreviewRequestSchema>;
