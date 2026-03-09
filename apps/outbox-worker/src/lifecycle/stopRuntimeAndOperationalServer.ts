import type { OperationalServerHandle } from '../ops/OperationalServer.js';
import type { RuntimeHandle } from '../runtime/createOutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../runtime/OutboxWorkerRuntime.js';

interface StopRuntimeAndOperationalServerOptions {
  runtime: Pick<RuntimeHandle, 'stop'>;
  operationalServer: Pick<OperationalServerHandle, 'stop'>;
  logger: OutboxWorkerRuntimeLogger;
  primaryError: unknown;
}

export async function stopRuntimeAndOperationalServer(
  options: StopRuntimeAndOperationalServerOptions
): Promise<void> {
  const cleanupErrors: unknown[] = [];

  try {
    await options.runtime.stop();
  } catch (error) {
    cleanupErrors.push(error);
  }

  try {
    await options.operationalServer.stop();
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (cleanupErrors.length === 0) {
    return;
  }

  if (options.primaryError !== null) {
    options.logger.error(
      {
        cleanupErrors: cleanupErrors.map(toErrorLike),
      },
      'outbox worker cleanup failed while handling a primary failure'
    );
    return;
  }

  if (cleanupErrors.length === 1) {
    throw cleanupErrors[0];
  }

  throw new AggregateError(cleanupErrors, 'outbox worker cleanup failed');
}

function toErrorLike(error: unknown): { message: string; name: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: String(error), name: 'UnknownError' };
}
