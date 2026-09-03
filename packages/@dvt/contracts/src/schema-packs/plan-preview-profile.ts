import { z } from 'zod';

import { ExecutionSelectionSchema } from '../contracts/planner/ExecutionSelection.v1.js';
import type { PlanPreviewProvenance } from '../contracts/planner/PlanPreviewProvenance.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

export { PlanPreviewProvenanceSchema } from '../contracts/planner/PlanPreviewProvenance.v1.js';
export const PlanPreviewSelectionSchema = ExecutionSelectionSchema;

export const PreviewProfileSchema = z.literal(PREVIEW_PROFILE.plannerGenericV1);

export type PreviewProfileSchemaT = z.infer<typeof PreviewProfileSchema>;
export type PlanPreviewProvenanceSchemaT = PlanPreviewProvenance;
export type PlanPreviewSelectionSchemaT = z.infer<typeof ExecutionSelectionSchema>;
