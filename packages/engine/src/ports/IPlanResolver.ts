import type { PlanRef } from '@dvt/contracts';

export type ResolvedPlan = {
  bytes: Uint8Array; // raw bytes used for sha256 validation
  text: string; // decoded utf-8 (JSON)
};

export interface IPlanResolver {
  fetch(planRef: PlanRef): Promise<ResolvedPlan>;
}
