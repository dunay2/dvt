import type { EngineRunRef } from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { HealthStatus, IRunHealthService } from '../domain/IRunHealthService.js';
import type { IRunStateStoreRead } from '../ports/IRunStateStore.js';
import { toErrorMessage } from '../utils/errorUtils.js';

interface HealthCheckable {
  ping?: () => Promise<void>;
}

export interface RunHealthServiceDeps {
  stateStoreRead: IRunStateStoreRead;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
}

export class RunHealthService implements IRunHealthService {
  constructor(private readonly deps: RunHealthServiceDeps) {}

  async healthCheck(): Promise<HealthStatus> {
    const checks: Array<{ name: string; target: HealthCheckable }> = [
      { name: 'stateStoreRead', target: this.deps.stateStoreRead as HealthCheckable },
      ...Array.from(this.deps.adapters.values()).map((adapter) => ({
        name: `adapter-${adapter.provider}`,
        target: adapter as IProviderAdapter & HealthCheckable,
      })),
    ];

    const components = await Promise.all(
      checks.map(async ({ name, target }) => {
        if (!target.ping) return { name, status: 'up' as const };
        try {
          await target.ping();
          return { name, status: 'up' as const };
        } catch (error) {
          return {
            name,
            status: 'down' as const,
            error: toErrorMessage(error),
          };
        }
      })
    );

    return {
      status: components.every((component) => component.status === 'up') ? 'healthy' : 'degraded',
      components,
    };
  }
}

export function buildRunHealthService(deps: RunHealthServiceDeps): IRunHealthService {
  return new RunHealthService(deps);
}
