import { z } from 'zod';

import { ExecutionSelectionSchema } from '../contracts/planner/ExecutionSelection.v1.js';
import type { PlanPreviewProvenance } from '../contracts/planner/PlanPreviewProvenance.v1.js';
import type { DesignGraphDraft } from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

export { DesignGraphDraftSchema } from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
export { PlanPreviewProvenanceSchema } from '../contracts/planner/PlanPreviewProvenance.v1.js';
export const PlanPreviewSelectionSchema = ExecutionSelectionSchema;

export const PreviewProfileSchema = z.enum([
  PREVIEW_PROFILE.plannerGenericV1,
  PREVIEW_PROFILE.transformationSqlFirstV2,
]);

export type PreviewProfileSchemaT = z.infer<typeof PreviewProfileSchema>;
export type DesignGraphDraftSchemaT = DesignGraphDraft;
export type PlanPreviewProvenanceSchemaT = PlanPreviewProvenance;
export type PlanPreviewSelectionSchemaT = z.infer<typeof ExecutionSelectionSchema>;
