/**
 * @file packages/@dvt/engine/src/domain/startRunIntentPolicy.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Engine domain policy delegates to canonical contract policy
 * @consequence Transition rules have a single source of truth across adapters and engine
 * @version 1.0.0
 * @date 2026-03-05
 */
export {
  canTransitionStartRunIntent,
  getAllowedFromStatuses,
  type StartRunIntentTransitionTarget,
} from '@dvt/contracts';
