/**
 * @ownedConcern Define shared Temporal worker runtime composition contracts.
 */
import type {
  ActivityDeps,
  DbtPluginRunner,
  RunStateCommandCircuitSnapshot,
  TemporalAdapterConfig,
  TemporalWorkerHostConfig,
} from '@dvt/adapter-temporal';
import type { IDbtProjectBundleReader, IRunExecutionContextReader } from '@dvt/artifacts';

import type { Env } from '../plugins/env.js';

export interface RuntimeHandle {
  start(signal?: globalThis.AbortSignal): Promise<void>;
  stop(): Promise<void>;
  getRunStateCircuitSnapshot(): RunStateCommandCircuitSnapshot;
}

export interface StateStoreLike {
  migrate(): Promise<void>;
  close(): Promise<void>;
  bootstrapRunTx(input: unknown): Promise<unknown>;
  appendAndEnqueueTx(runId: string, events: unknown[]): Promise<unknown>;
  abortPendingOperations?(): void | Promise<void>;
}

export type PlanFetcherLike = Pick<ActivityDeps['fetcher'], 'fetch'> & {
  close?(): Promise<void>;
};

export interface TemporalConnectionLike {
  close(): Promise<void>;
}

export interface TemporalWorkerHostLike {
  start(connection: TemporalConnectionLike): Promise<void>;
  shutdown(): Promise<void>;
}

export interface CreateTemporalWorkerRuntimeOptions {
  stateStoreFactory?: (env: Env) => StateStoreLike;
  runExecutionContextReaderFactory?: (env: Env) => IRunExecutionContextReader;
  bundleReaderFactory?: (env: Env) => IDbtProjectBundleReader;
  dbtPluginRunnerFactory?: (input: {
    env: Env;
    bundleReader: IDbtProjectBundleReader;
  }) => DbtPluginRunner;
  planFetcherFactory?: (env: Env) => PlanFetcherLike;
  hostFactory?: (config: TemporalWorkerHostConfig) => TemporalWorkerHostLike;
  connectionFactory?: (config: TemporalAdapterConfig) => Promise<TemporalConnectionLike>;
  dbtAvailabilityProbe?: (dbtBin: string) => Promise<void>;
}

export interface TemporalWorkerRuntimeResources {
  runMigrations: boolean;
  temporalConfig: TemporalAdapterConfig;
  stateStore: StateStoreLike;
  planStore: PlanFetcherLike;
  activityDeps: ActivityDeps;
  runStateCircuit: {
    getSnapshot(): RunStateCommandCircuitSnapshot;
  };
  dbtAvailabilityProbe?: () => Promise<void>;
  stepActivitiesByKind?: TemporalWorkerHostConfig['stepActivitiesByKind'];
}
