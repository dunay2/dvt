import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createStartRunOpenTelemetryProof,
  startRunProofRequest,
  type StartRunOpenTelemetryProof,
} from './startRunOpenTelemetry.integration.support.js';

let activeProof: StartRunOpenTelemetryProof | undefined;

afterEach(async () => {
  await activeProof?.close();
  activeProof = undefined;
  vi.restoreAllMocks();
});

describe('protected StartRun OpenTelemetry proof', () => {
  it('exports one connected API to engine to Temporal trace without prohibited payload data', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    activeProof = await createStartRunOpenTelemetryProof(true);

    const response = await startRunProofRequest(activeProof);
    await activeProof.observability.forceFlush();

    expect(response.statusCode, response.body).toBe(202);
    expect(activeProof.temporalSubmissions).toHaveLength(1);
    const spans = activeProof.exporter.getFinishedSpans();
    expect(spans.map((span) => span.name).sort()).toEqual([
      'api.startRun',
      'engine.startRun',
      'temporal.startRun',
    ]);

    const apiSpan = spanByName(spans, 'api.startRun');
    const engineSpan = spanByName(spans, 'engine.startRun');
    const temporalSpan = spanByName(spans, 'temporal.startRun');
    expect(new Set(spans.map((span) => span.spanContext().traceId)).size).toBe(1);
    expect(engineSpan.parentSpanContext?.spanId).toBe(apiSpan.spanContext().spanId);
    expect(temporalSpan.parentSpanContext?.spanId).toBe(engineSpan.spanContext().spanId);
    expect(apiSpan.attributes).toMatchObject({
      method: 'POST',
      operation: 'startRun',
      outcome: 'accepted',
      provider: 'temporal',
      route: '/runs/start',
    });
    expect(temporalSpan.attributes).toMatchObject({
      adapter: 'temporal',
      namespace: 'dvt-proof',
      operation: 'startRun',
      provider: 'temporal',
    });

    const exported = JSON.stringify(
      spans.map((span) => ({
        attributes: span.attributes,
        events: span.events,
        name: span.name,
        status: span.status,
      }))
    );
    expect(exported).not.toContain(activeProof.secretToken);
    expect(exported).not.toContain(activeProof.planPathSentinel);
    expect(exported).not.toMatch(/authorization|credential|planUri|request\.body|sql|yaml/i);
  });

  it('bounds an authorization rejection without creating engine or Temporal spans', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    activeProof = await createStartRunOpenTelemetryProof(false);

    const response = await startRunProofRequest(activeProof);
    await activeProof.observability.forceFlush();

    expect(response.statusCode, response.body).toBe(403);
    expect(activeProof.temporalSubmissions).toHaveLength(0);
    const spans = activeProof.exporter.getFinishedSpans();
    expect(spans.map((span) => span.name)).toEqual(['api.startRun']);
    expect(spans[0]?.attributes).toMatchObject({ outcome: 'rejected' });
  });
});

function spanByName(spans: readonly ReadableSpan[], name: string): ReadableSpan {
  const span = spans.find((candidate) => candidate.name === name);
  expect(span, `missing span ${name}`).toBeDefined();
  return span!;
}
