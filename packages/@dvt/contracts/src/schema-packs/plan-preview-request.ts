import { z } from 'zod';

import { ExecutionSelectionSchema } from '../contracts/planner/ExecutionSelection.v1.js';
import { TransformationSqlFirstCompilerGraphSourceSchema } from '../contracts/planner/TransformationFlowCompiler.v1.js';
import {
  PlanPreviewProvenanceSchema,
  TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY,
  TRANSFORMATION_SQL_FIRST_SOURCE_VERSION,
} from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

import { NonBlankStringSchema, RunContextSchema } from './common.js';
import { PreviewProfileSchema } from './plan-preview-profile.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

function addPlanPreviewRequestIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
): void {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function toIssuePathSegment(pathSegment: PropertyKey): string | number {
  return typeof pathSegment === 'number' ? pathSegment : String(pathSegment);
}

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
  .strict()
  .superRefine((request, ctx) => {
    if (request.previewProfile !== PREVIEW_PROFILE.transformationSqlFirstV1) {
      return;
    }

    if (request.provenance === undefined) {
      addPlanPreviewRequestIssue(
        ctx,
        ['provenance'],
        'transformation-sql-first-v1 requires graphArtifact and sqlArtifact provenance.'
      );
    }

    if (request.graphSource.sourceFamily !== TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY) {
      addPlanPreviewRequestIssue(
        ctx,
        ['graphSource', 'sourceFamily'],
        `transformation-sql-first-v1 requires sourceFamily ${TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY}.`
      );
    }

    if (request.graphSource.sourceVersion !== TRANSFORMATION_SQL_FIRST_SOURCE_VERSION) {
      addPlanPreviewRequestIssue(
        ctx,
        ['graphSource', 'sourceVersion'],
        `transformation-sql-first-v1 requires sourceVersion ${TRANSFORMATION_SQL_FIRST_SOURCE_VERSION}.`
      );
    }

    const graphSourceResult = TransformationSqlFirstCompilerGraphSourceSchema.safeParse(
      request.graphSource
    );
    if (!graphSourceResult.success) {
      for (const issue of graphSourceResult.error.issues) {
        addPlanPreviewRequestIssue(
          ctx,
          ['graphSource', ...issue.path.map(toIssuePathSegment)],
          issue.message
        );
      }
      return;
    }
  });

export type TransformationSqlFirstCompilerGraphSourceSchemaT = z.infer<
  typeof TransformationSqlFirstCompilerGraphSourceSchema
>;
export type PlanPreviewRequestSchemaT = z.infer<typeof PlanPreviewRequestSchema>;
