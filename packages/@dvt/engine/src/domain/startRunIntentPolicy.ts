import type { StartRunIntentStatus } from '../ports/IStartRunIntentStore.js';

export type StartRunIntentTransitionTarget = Exclude<StartRunIntentStatus, 'PENDING'>;

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
