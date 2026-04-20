import type { ExecutionPlan, PlanRef } from '@dvt/contracts';
import {
  jcsCanonicalize,
  summarizeTransformationSqlFirstPlan,
  sha256HexUtf8,
} from '@dvt/contracts';

import type { PreviewProfilePolicy } from './previewProfilePolicy.js';
import type { PreviewProvenance } from './previewProvenanceParser.js';

export type PreviewRouteResponse = {
  previewProfile: PreviewProfilePolicy['previewProfile'];
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
  provenance?: PreviewProvenance;
};

export function buildPreviewResponse(
  plan: ExecutionPlan,
  planRef: PlanRef,
  provenance: PreviewProvenance | undefined,
  previewProfile: PreviewProfilePolicy
): PreviewRouteResponse {
  const canonicalPlanJson = jcsCanonicalize(plan);
  const planSummary =
    previewProfile.executor === undefined
      ? undefined
      : summarizeTransformationSqlFirstPlan(plan);

  return {
    previewProfile: previewProfile.previewProfile,
    plan,
    planRef,
    ...(planSummary === undefined ? {} : { planSummary }),
    persisted: {
      planRecordId: planRef.planId,
      canonicalPlanSha256: sha256HexUtf8(canonicalPlanJson),
    },
    validation: {
      valid: true,
      warnings: [],
    },
    ...(provenance === undefined ? {} : { provenance }),
  };
}
