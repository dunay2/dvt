import { z } from 'zod';

import { TransformationSqlFirstCompilerGraphSourceSchema } from '../contracts/planner/TransformationFlowCompiler.v1.js';
import {
  PlanPreviewProvenanceSchema,
  TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY,
  TRANSFORMATION_SQL_FIRST_SOURCE_VERSION,
} from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

import { NonBlankStringSchema, RunContextSchema } from './common.js';
import { PreviewProfileSchema, PlanPreviewSelectedNodeIdsSchema } from './plan-preview-profile.js';
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

function haveMatchingNodeSelections(
  actualNodeIds: readonly string[],
  expectedNodeIds: readonly string[]
): boolean {
  if (actualNodeIds.length !== expectedNodeIds.length) {
    return false;
  }

  return actualNodeIds.every((nodeId, index) => nodeId === expectedNodeIds[index]);
}

function toIssuePathSegment(pathSegment: PropertyKey): string | number {
  return typeof pathSegment === 'number' ? pathSegment : String(pathSegment);
}

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

    const expectedSelectedNodeIds = graphSourceResult.data.nodes
      .map((node) => node.nodeId)
      .slice()
      .sort((left, right) => left.localeCompare(right));
    const actualSelectedNodeIds = [...request.selectedNodeIds].sort((left, right) =>
      left.localeCompare(right)
    );

    if (!haveMatchingNodeSelections(actualSelectedNodeIds, expectedSelectedNodeIds)) {
      addPlanPreviewRequestIssue(
        ctx,
        ['selectedNodeIds'],
        'transformation-sql-first-v1 requires selectedNodeIds to match the canonical compiler node ids.'
      );
    }
  });

export type TransformationSqlFirstCompilerGraphSourceSchemaT = z.infer<
  typeof TransformationSqlFirstCompilerGraphSourceSchema
>;
export type PlanPreviewRequestSchemaT = z.infer<typeof PlanPreviewRequestSchema>;
