/**
 * @file packages/@dvt/engine/src/ports/IPlanResolver.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The plan resolver defines an explicit port for fetching bytes/text under domain control
 * @consequence Integrity validation and parsing are decoupled from the plan transport/source
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { PlanRef } from '@dvt/contracts';

export type ResolvedPlan = {
  bytes: Uint8Array; // raw bytes used for sha256 validation
  text: string; // decoded utf-8 (JSON)
};

export interface IPlanResolver {
  fetch(planRef: PlanRef): Promise<ResolvedPlan>;
}
