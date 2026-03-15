import type { ILineageSink, LineagePublishPayload } from '@dvt/contracts';

export interface HttpOpenLineageSinkConfig {
  /**
   * Base URL for the OpenLineage API endpoint.
   * Example: 'http://localhost:5000/api/v1'
   */
  apiUrl: string;
  /**
   * Namespace used in the OpenLineage RunEvent.
   */
  namespace: string;
  /**
   * Optional HTTP headers to include in every request (e.g. Authorization).
   */
  headers?: Record<string, string>;
  /**
   * Request timeout in milliseconds. Defaults to 10000.
   */
  timeoutMs?: number;
}

/**
 * HTTP sink that publishes lineage facets to a Marquez-compatible
 * OpenLineage API endpoint.
 *
 * G10 — fail-open: throws on non-2xx status so the caller (LineageWorkerRuntime)
 * can retry via markFailed or move to dead letter.
 */
export class HttpOpenLineageSink implements ILineageSink {
  private readonly apiUrl: string;
  private readonly namespace: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(config: HttpOpenLineageSinkConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.namespace = config.namespace;
    this.headers = config.headers ?? {};
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  async publish(payload: LineagePublishPayload): Promise<void> {
    const body = buildRunEvent(this.namespace, payload);
    const url = `${this.apiUrl}/lineage`;

    const controller = new globalThis.AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await globalThis.fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`OpenLineage HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// OpenLineage RunEvent builder
// ---------------------------------------------------------------------------

interface OpenLineageRunEvent {
  eventType: string;
  eventTime: string;
  run: {
    runId: string;
  };
  job: {
    namespace: string;
    name: string;
    facets: Record<string, unknown>;
  };
  producer: string;
  schemaURL: string;
}

function buildRunEvent(namespace: string, payload: LineagePublishPayload): OpenLineageRunEvent {
  return {
    eventType: toOpenLineageEventType(payload.eventType),
    eventTime: new Date().toISOString(),
    run: {
      runId: payload.runId,
    },
    job: {
      namespace,
      name: payload.runId,
      facets: payload.jobFacets as Record<string, unknown>,
    },
    producer: 'https://github.com/dunay2/dvt/tree/main/packages/@dvt/traceability-service',
    schemaURL: 'https://openlineage.io/spec/1-0-5/OpenLineage.json#/definitions/RunEvent',
  };
}

function toOpenLineageEventType(dvtEventType: string): string {
  switch (dvtEventType) {
    case 'StepStarted':
      return 'START';
    case 'StepCompleted':
      return 'COMPLETE';
    case 'StepFailed':
      return 'FAIL';
    default:
      return 'OTHER';
  }
}
