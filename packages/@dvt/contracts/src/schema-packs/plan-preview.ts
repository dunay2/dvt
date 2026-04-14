import { z } from 'zod';

import {
  PlanPreviewProvenanceSchema,
  TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY,
  TRANSFORMATION_SQL_FIRST_SOURCE_VERSION,
  type DesignGraphDraft,
  type PlanPreviewProvenance,
} from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

import {
  NonBlankStringSchema,
  PlanRefSchema,
  RunContextSchema,
  Sha256HexStringSchema,
  TransformationExecutorSchema,
} from './common.js';
import { ExecutionPlanSchema } from './execution-plan.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

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

export const PlanPreviewRequestSchema = z
  .object({
    previewProfile: PreviewProfileSchema,
    context: RunContextSchema,
    selectedNodeIds: PlanPreviewSelectedNodeIdsSchema,
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
      ctx.addIssue({
        code: 'custom',
        path: ['provenance'],
        message: 'transformation-sql-first-v1 requires graphArtifact and sqlArtifact provenance.',
      });
    }

    if (request.graphSource.sourceFamily !== TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY) {
      ctx.addIssue({
        code: 'custom',
        path: ['graphSource', 'sourceFamily'],
        message: `transformation-sql-first-v1 requires sourceFamily ${TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY}.`,
      });
    }

    if (request.graphSource.sourceVersion !== TRANSFORMATION_SQL_FIRST_SOURCE_VERSION) {
      ctx.addIssue({
        code: 'custom',
        path: ['graphSource', 'sourceVersion'],
        message: `transformation-sql-first-v1 requires sourceVersion ${TRANSFORMATION_SQL_FIRST_SOURCE_VERSION}.`,
      });
    }
  });

export const PlanPreviewSummarySchema = z
  .object({
    executor: TransformationExecutorSchema,
    nodeCount: z.number().int().nonnegative(),
    stepCount: z.number().int().nonnegative(),
    sourceTables: z.array(NonBlankStringSchema),
    sinkTables: z.array(NonBlankStringSchema),
  })
  .strict();

export const PlanPreviewPersistedRecordSchema = z
  .object({
    planRecordId: NonBlankStringSchema,
    canonicalPlanSha256: Sha256HexStringSchema,
  })
  .strict();

export const PlanPreviewValidationSchema = z
  .object({
    valid: z.literal(true),
    warnings: z.array(z.string()),
  })
  .strict();

export const PlanPreviewPersistResponseSchema = z
  .object({
    previewProfile: PreviewProfileSchema,
    plan: ExecutionPlanSchema,
    planRef: PlanRefSchema,
    planSummary: PlanPreviewSummarySchema.optional(),
    persisted: PlanPreviewPersistedRecordSchema,
    validation: PlanPreviewValidationSchema,
    provenance: PlanPreviewProvenanceSchema.optional(),
  })
  .strict()
  .superRefine((response, ctx) => {
    if (response.previewProfile !== PREVIEW_PROFILE.transformationSqlFirstV1) {
      return;
    }

    if (response.provenance === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['provenance'],
        message:
          'transformation-sql-first-v1 responses require graphArtifact and sqlArtifact provenance.',
      });
    }

    if (response.planSummary === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['planSummary'],
        message: 'transformation-sql-first-v1 responses require planSummary.',
      });
      return;
    }

    if (response.planSummary.executor !== 'postgres') {
      ctx.addIssue({
        code: 'custom',
        path: ['planSummary', 'executor'],
        message: 'transformation-sql-first-v1 responses require executor postgres.',
      });
    }
  });

export type PreviewProfileSchemaT = z.infer<typeof PreviewProfileSchema>;
export type DesignGraphDraftSchemaT = DesignGraphDraft;
export type PlanPreviewProvenanceSchemaT = PlanPreviewProvenance;
export type PlanPreviewRequestSchemaT = z.infer<typeof PlanPreviewRequestSchema>;
export type PlanPreviewSummarySchemaT = z.infer<typeof PlanPreviewSummarySchema>;
export type PlanPreviewPersistedRecordSchemaT = z.infer<typeof PlanPreviewPersistedRecordSchema>;
export type PlanPreviewValidationSchemaT = z.infer<typeof PlanPreviewValidationSchema>;
export type PlanPreviewPersistResponseSchemaT = z.infer<typeof PlanPreviewPersistResponseSchema>;
