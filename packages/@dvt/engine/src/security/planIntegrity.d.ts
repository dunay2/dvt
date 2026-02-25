/**
 * @file packages/@dvt/engine/src/security/planIntegrity.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Plan integrity is validated using SHA-256 before execution
 * @consequence Executions against altered plans are prevented and trust in plan references is reinforced
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { PlanRef } from '@dvt/contracts';
/** Fetches raw plan bytes for SHA-256 integrity validation. */
export interface IRawPlanFetcher {
  fetch(planRef: PlanRef): Promise<Uint8Array>;
}
export declare class PlanIntegrityValidator {
  fetchAndValidate(planRef: PlanRef, fetcher: IRawPlanFetcher): Promise<Uint8Array>;
}
//# sourceMappingURL=planIntegrity.d.ts.map
