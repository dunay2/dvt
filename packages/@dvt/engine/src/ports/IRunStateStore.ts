/**
 * @baseline ADR-0003
 * @note Port boundary retained. Canonical type definitions live in @dvt/contracts (shared kernel).
 *       Engine-internal consumers MUST import from this file — never directly from @dvt/contracts —
 *       so that the port boundary remains the sole seam for future divergence.
 */
export type {
  AppendResult,
  IRunStateStore,
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
  ListEventsOptions,
  ListRunsOptions,
  ProviderRefUpdate,
  RetryAttemptReservation,
  RunBootstrapInput,
} from '@dvt/contracts';
