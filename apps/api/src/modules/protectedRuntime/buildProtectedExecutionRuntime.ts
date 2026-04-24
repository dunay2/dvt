/**
 * Owned concern: assemble the protected execution runtime from live provider
 * adapters, workflow-engine wiring, and canonical adapter-registry truth.
 */
import type { IObservability } from '@dvt/observability';
import type { Logger } from 'pino';

import { createStartRunTargetAdapterRegistryFromValues } from '../../application/services/startRunTargetAdapterRegistry.js';
import { buildWorkflowEngine } from '../../application/services/WorkflowEngineFactory.js';
import {
  ProtectedRuntimeTenantAuthorizer,
  protectRunEnrichmentServiceWithTenantScope,
  protectWorkflowEngineWithTenantScope,
} from '../../application/services/protectedRuntimeTenantAuthorizer.js';
import type { Env } from '../../plugins/env.js';
import { buildProviderAdapters } from '../buildProviderAdapters.js';
import { createTemporalProviderAdapterFactory } from '../providerAdapters/createTemporalProviderAdapterFactory.js';

import type { ProtectedRuntimeStorage } from './buildProtectedRuntimeStorage.js';

export type BuildProtectedExecutionRuntimeDeps = {
  readonly appLogger: Logger;
  readonly env: Env;
  readonly observability: IObservability;
  readonly storageRuntime: ProtectedRuntimeStorage;
};

export async function buildProtectedExecutionRuntime(
  deps: BuildProtectedExecutionRuntimeDeps
) {
  const { adapters, close: closeAdapters } = await buildProviderAdapters(
    deps.env,
    {
      stateStore: deps.storageRuntime.stateStoreRoles.read,
      stateStoreWrite: deps.storageRuntime.stateStoreRoles.write,
      clock: deps.storageRuntime.systemClock,
      projector: deps.storageRuntime.projector,
      observability: deps.observability,
    },
    [createTemporalProviderAdapterFactory()]
  );
  const startRunTargetAdapterRegistry = createStartRunTargetAdapterRegistryFromValues(
    adapters.keys()
  );

  if (adapters.has('temporal')) {
    deps.appLogger.info(`Temporal adapter registered (address=${deps.env.TEMPORAL_ADDRESS})`);
  }

  const tenantAuthorizer = new ProtectedRuntimeTenantAuthorizer();
  const { engine, runEnrichmentService, runHealthService } = buildWorkflowEngine({
    security: {
      authorizer: tenantAuthorizer,
      planRefAllowedSchemes: ['https', 's3', 'gs', 'azure', 'dvt-plan'],
    },
    persistence: {
      stateStoreRead: deps.storageRuntime.stateStoreRoles.read,
      stateStoreWrite: deps.storageRuntime.stateStoreRoles.write,
      intentStore: deps.storageRuntime.intentStore,
      planFetcher: deps.storageRuntime.planStore,
      runExecutionContextResolver: deps.storageRuntime.runExecutionContextResolver,
      runExecutionContextBindingPolicy: deps.storageRuntime.runExecutionContextBindingPolicy,
    },
    runtime: { adapters },
    infrastructure: {
      clock: deps.storageRuntime.systemClock,
      observability: deps.observability,
    },
  });

  return {
    adapters,
    closeAdapters,
    engine: protectWorkflowEngineWithTenantScope(engine, tenantAuthorizer),
    runEnrichmentService: protectRunEnrichmentServiceWithTenantScope(
      runEnrichmentService,
      tenantAuthorizer
    ),
    runHealthService,
    startRunTargetAdapterRegistry,
  };
}
