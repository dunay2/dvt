/**
 * @ownedConcern Assemble focused Temporal worker runtime modules into the public runtime handle.
 */
import type { Logger } from 'pino';

import type { Env } from '../plugins/env.js';

import type { CreateTemporalWorkerRuntimeOptions, RuntimeHandle } from './runtimeTypes.js';
import { createTemporalWorkerHost } from './temporalWorkerHost.js';
import { createTemporalWorkerRuntimeHandle } from './temporalWorkerRuntimeHandle.js';
import { createTemporalWorkerRuntimeResources } from './temporalWorkerRuntimeResources.js';

export type { CreateTemporalWorkerRuntimeOptions, RuntimeHandle } from './runtimeTypes.js';

export async function createTemporalWorkerRuntime(
  env: Env,
  _logger: Pick<Logger, 'info' | 'error'>,
  options: CreateTemporalWorkerRuntimeOptions = {}
): Promise<RuntimeHandle> {
  const resources = createTemporalWorkerRuntimeResources(env, options);
  const host = createTemporalWorkerHost(resources, options);
  return createTemporalWorkerRuntimeHandle({
    resources,
    host,
    ...(options.connectionFactory === undefined
      ? {}
      : { connectionFactory: options.connectionFactory }),
  });
}
