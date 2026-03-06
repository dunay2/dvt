/**
 * @file packages/@dvt/contracts/src/contracts/engine/StartRunIntentPolicy.v1.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Canonical transition policy for start-run intent lifecycle
 * @consequence Transition guards remain consistent across in-memory and persistent stores
 * @version 1.0.0
 * @date 2026-03-05
 */
import type {
  StartRunIntentStatus,
  StartRunIntentTransitionTarget,
} from './IStartRunIntentStore.v1';

const TRANSITION_RULES: Record<StartRunIntentTransitionTarget, readonly StartRunIntentStatus[]> = {
  DISPATCHED: ['PENDING'],
  RESOLVED: ['PENDING', 'DISPATCHED'],
  EXPIRED: ['PENDING'],
};

export function getAllowedFromStatuses(
  toStatus: StartRunIntentTransitionTarget
): readonly StartRunIntentStatus[] {
  return TRANSITION_RULES[toStatus];
}

export function canTransitionStartRunIntent(
  fromStatus: StartRunIntentStatus,
  toStatus: StartRunIntentTransitionTarget
): boolean {
  return getAllowedFromStatuses(toStatus).includes(fromStatus);
}
