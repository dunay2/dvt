import { z } from 'zod';

import { ExecutionSelectionSchema } from '../contracts/planner/ExecutionSelection.v1.js';
import {
  type DesignGraphDraft,
  type PlanPreviewProvenance,
} from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

export {
  DesignGraphDraftSchema,
  PlanPreviewProvenanceSchema,
} from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
export const PlanPreviewSelectionSchema = ExecutionSelectionSchema;

export const PreviewProfileSchema = z.enum([
  PREVIEW_PROFILE.plannerGenericV1,
  PREVIEW_PROFILE.transformationSqlFirstV1,
]);

export type PreviewProfileSchemaT = z.infer<typeof PreviewProfileSchema>;
export type DesignGraphDraftSchemaT = DesignGraphDraft;
export type PlanPreviewProvenanceSchemaT = PlanPreviewProvenance;
export type PlanPreviewSelectionSchemaT = z.infer<typeof ExecutionSelectionSchema>;
