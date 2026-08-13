import type {
  ExecutionPlan,
  PlanPreviewProvenance,
  PlanRecord,
  PlanRef,
  PreviewProfile,
} from '@dvt/contracts';
import { PREVIEW_PROFILE, summarizeTransformationSqlFirstPlan } from '@dvt/contracts';

export type PreviewRouteResponse = {
  previewProfile: PreviewProfile;
  plan: ExecutionPlan;
  planRef: PlanRef;
  planSummary?: {
    executor: 'postgres' | 'dbt';
    nodeCount: number;
    stepCount: number;
    sourceTables: readonly string[];
    sinkTables: readonly string[];
  };
  persisted: {
    planRecordId: string;
    canonicalPlanSha256: string;
  };
  validation: {
    valid: true;
    warnings: string[];
  };
  provenance?: PlanPreviewProvenance;
};

export function buildPreviewResponse(
  plan: ExecutionPlan,
  planRef: PlanRef,
  planRecord: PlanRecord,
  provenance: PlanPreviewProvenance | undefined,
  previewProfile: PreviewProfile
): PreviewRouteResponse {
  const planSummary =
    previewProfile === PREVIEW_PROFILE.transformationSqlFirstV1
      ? summarizeTransformationSqlFirstPlan(plan)
      : undefined;

  return {
    previewProfile,
    plan,
    planRef,
    ...(planSummary === undefined ? {} : { planSummary }),
    persisted: {
      planRecordId: planRecord.planId,
      canonicalPlanSha256: planRecord.canonicalHash,
    },
    validation: {
      valid: true,
      warnings: [],
    },
    ...(provenance === undefined ? {} : { provenance }),
  };
}
