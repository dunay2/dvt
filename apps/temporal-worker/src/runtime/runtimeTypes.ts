/**
 * @ownedConcern Define shared Temporal worker runtime composition contracts.
 */
import type {
  ActivityDeps,
  RunStateCommandCircuitSnapshot,
  TemporalAdapterConfig,
  TemporalPlanArtifactReader,
  TemporalWorkerHostConfig,
} from '@dvt/adapter-temporal';
import type {
  IContentAddressedArtifactStore,
  IDbtProjectBundleReader,
  IRunExecutionContextReader,
} from '@dvt/artifacts';
import type { AppendResult, EventInput, RunBootstrapInput } from '@dvt/engine';
import type { DbtPluginRunner, IDbtRuntimeProfileResolver } from '@dvt/temporal-dbt-plugin';
import type { HttpJsonAcquisitionClient } from '@dvt/temporal-http-json-plugin';
import type {
  ContentAddressedObjectReader,
  ObjectFilePostgresRelationalLoader,
} from '@dvt/temporal-object-file-postgres-plugin';

import type { Env } from '../plugins/env.js';

export interface RuntimeHandle {
  start(signal?: globalThis.AbortSignal): Promise<void>;
  stop(): Promise<void>;
  getRunStateCircuitSnapshot(): RunStateCommandCircuitSnapshot;
}

export interface StateStoreLike {
  migrate(): Promise<void>;
  close(): Promise<void>;
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: EventInput[]): Promise<AppendResult>;
  abortPendingOperations?(): void | Promise<void>;
}

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
  dbtRuntimeProfileResolverFactory?: () => IDbtRuntimeProfileResolver;
  dbtPluginRunnerFactory?: (input: {
    env: Env;
    bundleReader: IDbtProjectBundleReader;
  }) => DbtPluginRunner;
  planArtifactReaderFactory?: (env: Env) => TemporalPlanArtifactReader;
  postgresObjectFileLoadingCapabilityFactory?: (
    env: Env
  ) => TemporalWorkerPostgresLoadingCapability;
  objectFileReaderFactory?: (env: Env) => ContentAddressedObjectReader;
  httpJsonClientFactory?: (env: Env) => HttpJsonAcquisitionClient;
  contentAddressedArtifactStoreFactory?: (env: Env) => IContentAddressedArtifactStore;
  hostFactory?: (config: TemporalWorkerHostConfig) => TemporalWorkerHostLike;
  connectionFactory?: (config: TemporalAdapterConfig) => Promise<TemporalConnectionLike>;
  dbtAvailabilityProbe?: (dbtBin: string) => Promise<void>;
}

export interface TemporalWorkerPostgresLoadingCapability extends ObjectFilePostgresRelationalLoader {
  close(): Promise<void>;
}

export interface TemporalWorkerRuntimeResources {
  runMigrations: boolean;
  temporalConfig: TemporalAdapterConfig;
  stateStore: StateStoreLike;
  planArtifactReader: TemporalPlanArtifactReader;
  activityDeps: ActivityDeps;
  runStateCircuit: {
    getSnapshot(): RunStateCommandCircuitSnapshot;
  };
  dbtAvailabilityProbe?: () => Promise<void>;
  stepActivitiesByKind?: TemporalWorkerHostConfig['stepActivitiesByKind'];
  closeStepActivityResources?: () => Promise<void>;
}
