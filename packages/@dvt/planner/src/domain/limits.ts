/**
 * ADR baseline: ADR-0004-security-limits
 */
import { PlannerError, PlannerErrorCode } from './errors.js';

export interface PlannerLimits {
  maxNodes: number;
  maxEdges: number;
  maxDepth: number;
  maxPlanSizeBytes: number;
  timeoutMs: number;
}

const DEFAULT_LIMITS: PlannerLimits = {
  maxNodes: 25_000,
  maxEdges: 150_000,
  maxDepth: 2_000,
  maxPlanSizeBytes: 8_000_000, // 8MB canonical JSON
  timeoutMs: 15_000,
};

export function resolveLimits(partial?: Partial<PlannerLimits>): PlannerLimits {
  return {
    maxNodes: partial?.maxNodes ?? DEFAULT_LIMITS.maxNodes,
    maxEdges: partial?.maxEdges ?? DEFAULT_LIMITS.maxEdges,
    maxDepth: partial?.maxDepth ?? DEFAULT_LIMITS.maxDepth,
    maxPlanSizeBytes: partial?.maxPlanSizeBytes ?? DEFAULT_LIMITS.maxPlanSizeBytes,
    timeoutMs: partial?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs,
  };
}

export function throwLimitExceeded(message: string): never {
  throw new PlannerError(PlannerErrorCode.LIMIT_EXCEEDED, message);
}
