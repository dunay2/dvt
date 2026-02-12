/**
 * Core Type Definitions for DVT Engine
 */

export type TenantId = string & { readonly __brand: 'TenantId' };
export type PlanId = string & { readonly __brand: 'PlanId' };
export type RunId = string & { readonly __brand: 'RunId' };
export type StepId = string & { readonly __brand: 'StepId' };
export type EventId = string & { readonly __brand: 'EventId' };
export type AttemptNumber = number & { readonly __brand: 'AttemptNumber' };
export type SnapshotVersion = number & { readonly __brand: 'SnapshotVersion' };
export type ContractVersion = string & { readonly __brand: 'ContractVersion' };
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

export enum RunState {
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum StepState {
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface WorkflowSnapshot {
  readonly runId: RunId;
  readonly tenantId: TenantId;
  readonly planId: PlanId;
  readonly version: SnapshotVersion;
  readonly state: RunState;
  readonly steps: ReadonlyMap<StepId, StepState>;
  readonly stepOutputs: ReadonlyMap<StepId, unknown>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WorkflowEvent {
  readonly id: EventId;
  readonly runId: RunId;
  readonly tenantId: TenantId;
  readonly type: string;
  readonly timestamp: number;
  readonly data: unknown;
  readonly version: ContractVersion;
}

export interface DeterminismConfig {
  readonly clock: { now(): number };
  readonly prng: { next(): number };
}
