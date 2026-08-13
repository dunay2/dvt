import type { PlanRef } from '@dvt/contracts';

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
