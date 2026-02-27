/**
 * @file packages/@dvt/engine/src/security/planIntegrity.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Plan integrity is validated using SHA-256 before execution
 * @consequence Executions against altered plans are prevented and trust in plan references is reinforced
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { PlanRef } from '@dvt/contracts';

import { sha256Hex } from '../utils/sha256.js';

/** Fetches raw plan bytes for SHA-256 integrity validation. */
export interface IRawPlanFetcher {
  fetch(planRef: PlanRef): Promise<Uint8Array>;
}

export class PlanIntegrityValidator {
  async fetchAndValidate(planRef: PlanRef, fetcher: IRawPlanFetcher): Promise<Uint8Array> {
    const bytes = await fetcher.fetch(planRef);
    const actual = sha256Hex(bytes);
    if (actual !== planRef.sha256) {
      const err = new Error(
        `PLAN_INTEGRITY_VALIDATION_FAILED: expected=${planRef.sha256} actual=${actual}`
      );
      // In real impl: emit P1 alert + audit log.
      throw err;
    }
    return bytes;
  }
}
