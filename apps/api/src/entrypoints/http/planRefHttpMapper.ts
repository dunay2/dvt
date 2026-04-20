import type { PlanRef } from '@dvt/contracts';
import { asNonBlankString } from '@dvt/contracts';

export function normalizePlanRef(
  planRef: Pick<
    PlanRef,
    'uri' | 'sha256' | 'schemaVersion' | 'planId' | 'planVersion' | 'sizeBytes' | 'expiresAt'
  >
): PlanRef {
  return {
    uri: planRef.uri,
    sha256: planRef.sha256,
    schemaVersion: planRef.schemaVersion,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    ...(planRef.sizeBytes === undefined ? {} : { sizeBytes: planRef.sizeBytes }),
    ...(planRef.expiresAt === undefined ? {} : { expiresAt: planRef.expiresAt }),
  };
}

export function toContractPlanRef(planRef: {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
}): PlanRef {
  return {
    uri: asNonBlankString(planRef.uri),
    sha256: asNonBlankString(planRef.sha256),
    schemaVersion: asNonBlankString(planRef.schemaVersion),
    planId: asNonBlankString(planRef.planId),
    planVersion: asNonBlankString(planRef.planVersion),
  };
}
