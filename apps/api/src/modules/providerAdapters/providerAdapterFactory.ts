/**
 * Owned concern: define the protected-runtime provider-adapter factory seam.
 *
 * Concrete provider adapters implement this contract outside the generic
 * adapter-map assembler so provider runtime details stay replaceable.
 */
import type {
  EngineRunRef,
  IClock,
  IProviderAdapter,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '@dvt/engine';
import type { IObservability } from '@dvt/observability';

import type { Env } from '../../plugins/env.js';

export interface ProviderAdapterFactoryContext {
  readonly env: Env;
  readonly stateStore: Pick<IRunStateStoreRead, 'getRunMetadataByRunId' | 'listEvents'>;
  readonly stateStoreWrite: Pick<IRunStateStoreWrite, 'appendAndEnqueueTx'>;
  readonly clock: Pick<IClock, 'nowIsoUtc'>;
  readonly projector: { rebuild(runId: string, events: unknown[]): unknown };
  readonly observability: IObservability;
}

export interface ProviderAdapterFactoryRegistration {
  readonly adapter: IProviderAdapter;
  readonly close?: () => Promise<void>;
}

export interface ProviderAdapterFactory {
  readonly provider: EngineRunRef['provider'];
  build(
    context: ProviderAdapterFactoryContext
  ): Promise<ProviderAdapterFactoryRegistration | null>;
}
