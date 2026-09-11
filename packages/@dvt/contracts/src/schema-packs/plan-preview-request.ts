import { z } from 'zod';

import { ExecutionSelectionSchema } from '../contracts/planner/ExecutionSelection.v1.js';
import {
  DvtProtectedWorkspaceGraphProvenanceSchema,
  NonDvtPlanPreviewProvenanceSchema,
} from '../contracts/planner/PlanPreviewProvenance.v1.js';

import { NonBlankStringSchema, RunContextSchema } from './common.js';
import { PreviewProfileSchema } from './plan-preview-profile.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

const CommonPreviewRequestShape = {
  previewProfile: PreviewProfileSchema,
  context: RunContextSchema,
  selection: ExecutionSelectionSchema,
  planName: NonBlankStringSchema.optional(),
  persist: z.literal(true),
} as const;

const ProtectedDvtPreviewRequestSchema = z
  .object({
    ...CommonPreviewRequestShape,
    provenance: DvtProtectedWorkspaceGraphProvenanceSchema,
    graphSource: z.never().optional(),
  })
  .strict();

const ExternalGraphPreviewRequestSchema = z
  .object({
    ...CommonPreviewRequestShape,
    graphSource: GenericGraphSourceV1Schema,
    provenance: NonDvtPlanPreviewProvenanceSchema.optional(),
  })
  .strict();

export const PlanPreviewRequestSchema = z.union([
  ProtectedDvtPreviewRequestSchema,
  ExternalGraphPreviewRequestSchema,
]);

export type PlanPreviewRequestSchemaT = z.infer<typeof PlanPreviewRequestSchema>;
