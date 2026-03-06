/**
 * @file packages/@dvt/engine/src/contracts/intentErrors.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Intent errors are defined in the canonical contracts package
 * @consequence Engine and adapters share the same error classes and stable codes
 * @version 1.0.0
 * @date 2026-03-05
 */
export {
  IntentInvalidTransitionError,
  IntentNotFoundError,
  StoreNotReadyError,
} from '@dvt/contracts';
