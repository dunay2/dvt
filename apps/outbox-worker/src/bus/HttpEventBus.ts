import type { IEventBus, RunEventPersisted } from '@dvt/engine';

export interface HttpEventBusOptions {
  targetUrl: string;
  timeoutMs?: number;
  bearerToken?: string;
  serviceName?: string;
  fetchImpl?: typeof globalThis.fetch;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class HttpEventBus implements IEventBus {
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  private readonly pendingControllers = new Set<AbortController>();

  constructor(private readonly options: HttpEventBusOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async publish(events: RunEventPersisted[]): Promise<void> {
    const controller = new globalThis.AbortController();
    this.pendingControllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Awaited<ReturnType<typeof globalThis.fetch>> | null = null;

    try {
      response = await this.fetchImpl(this.options.targetUrl, {
        method: 'POST',
        headers: buildHeaders(this.options),
        body: JSON.stringify({ events }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP_EVENT_BUS_BAD_STATUS: ${response.status}`);
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw new Error(`HTTP_EVENT_BUS_TIMEOUT: ${this.timeoutMs}`, {
          cause: error,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      this.pendingControllers.delete(controller);
      await safelyDisposeResponse(response);
    }
  }

  abortPendingPublishes(): void {
    for (const controller of [...this.pendingControllers]) {
      controller.abort();
    }
  }
}

function buildHeaders(options: HttpEventBusOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };

  if (options.serviceName) {
    headers['user-agent'] = options.serviceName;
  }
  if (options.bearerToken) {
    headers.authorization = `Bearer ${options.bearerToken}`;
  }

  return headers;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function safelyDisposeResponse(
  response: Awaited<ReturnType<typeof globalThis.fetch>> | null
): Promise<void> {
  if (!response?.body) return;
  try {
    await response.body.cancel();
  } catch {
    // Cleanup must not mask publish success/failure.
  }
}
