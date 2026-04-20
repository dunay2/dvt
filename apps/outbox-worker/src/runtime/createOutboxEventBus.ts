import type { IEventBus } from '@dvt/delivery';

import { HttpEventBus } from '../bus/HttpEventBus.js';
import { LoggingEventBus } from '../bus/LoggingEventBus.js';
import type { ActiveEnv } from '../plugins/env.js';

import type { OutboxWorkerRuntimeLogger } from './OutboxWorkerRuntime.js';

export interface InterruptibleEventBus extends IEventBus {
  abortPendingPublishes?(): void;
}

export function createOutboxEventBus(
  env: ActiveEnv,
  logger: OutboxWorkerRuntimeLogger
): InterruptibleEventBus {
  switch (env.DVT_OUTBOX_EVENT_BUS_MODE) {
    case 'http':
      return new HttpEventBus({
        targetUrl: env.DVT_OUTBOX_HTTP_TARGET_URL,
        timeoutMs: env.DVT_OUTBOX_HTTP_TIMEOUT_MS,
        serviceName: env.SERVICE_NAME,
        ...(env.DVT_OUTBOX_HTTP_BEARER_TOKEN
          ? { bearerToken: env.DVT_OUTBOX_HTTP_BEARER_TOKEN }
          : {}),
      });
    case 'log':
      return new LoggingEventBus(logger);
  }
}
