import { z } from 'zod';

import {
  type DesignGraphDraft,
  type PlanPreviewProvenance,
} from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

import { NonBlankStringSchema } from './common.js';

export {
  DesignGraphDraftSchema,
  PlanPreviewProvenanceSchema,
} from '../contracts/planner/TransformationFlowDesignGraph.v1.js';

export const PreviewProfileSchema = z.enum([
  PREVIEW_PROFILE.plannerGenericV1,
  PREVIEW_PROFILE.transformationSqlFirstV1,
]);

export const PlanPreviewSelectedNodeIdsSchema = z
  .array(NonBlankStringSchema)
  .min(1)
  .superRefine((selectedNodeIds, ctx) => {
    const uniqueNodeIds = new Set(selectedNodeIds);
    if (uniqueNodeIds.size !== selectedNodeIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'selectedNodeIds must not contain duplicates.',
      });
    }
  });

export type PreviewProfileSchemaT = z.infer<typeof PreviewProfileSchema>;
export type DesignGraphDraftSchemaT = DesignGraphDraft;
export type PlanPreviewProvenanceSchemaT = PlanPreviewProvenance;
