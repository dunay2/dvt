import type { OperationalServerHandle } from '../ops/OperationalServer.js';
import type { RuntimeHandle } from '../runtime/createOutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../runtime/OutboxWorkerRuntime.js';

interface StopRuntimeAndOperationalServerOptions {
  runtime: Pick<RuntimeHandle, 'stop'> | null;
  operationalServer: Pick<OperationalServerHandle, 'stop'>;
  logger: OutboxWorkerRuntimeLogger;
  primaryError: unknown;
}

export async function stopRuntimeAndOperationalServer(
  options: StopRuntimeAndOperationalServerOptions
): Promise<void> {
  const cleanupErrors: unknown[] = [];

  if (options.runtime) {
    try {
      await options.runtime.stop();
    } catch (error) {
      cleanupErrors.push(error);
    }
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

  if (typeof error === 'string') {
    return { message: error, name: 'ErrorString' };
  }

  if (error === null) {
    return { message: 'null', name: 'UnknownError' };
  }

  if (typeof error === 'object') {
    const constructorName = error.constructor?.name;
    const serialized = safeSerializeObject(error);
    return {
      message: serialized ?? constructorName ?? 'UnserializableErrorObject',
      name: constructorName && constructorName !== 'Object' ? constructorName : 'UnknownError',
    };
  }

  return { message: String(error), name: typeof error };
}

function safeSerializeObject(value: object): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
