import { describe, expect, it } from 'vitest';

import { makeRunQueuedEvent } from './support/standaloneCanaryEventSupport.js';
import {
  createActiveCanaryEnvInput,
  fetchJson,
  fetchText,
  startHost,
  stopHost,
  waitFor,
} from './support/standaloneCanaryHostSupport.js';
import { startHttpSink } from './support/standaloneCanaryHttpSink.js';
import { withPatchedPostgresOutboxFixture } from './support/standaloneCanaryOutboxFixture.js';

describe('standalone canary acceptance ordering and replay', () => {
  it('does not bypass later same-run events after downstream recovery', async () => {
    const sink = await startHttpSink({
      responseSequence: [
        {
          statusCode: 503,
          responseBody: { error: 'synthetic first-attempt outage' },
        },
        {
          statusCode: 200,
          responseBody: { ok: true },
        },
      ],
    });

    try {
      await withPatchedPostgresOutboxFixture({ retryDelayMs: 25 }, async (fixture) => {
        await fixture.seedPending([makeRunQueuedEvent(1), makeRunQueuedEvent(2), makeRunQueuedEvent(3)]);

        const activeHost = await startHost(createActiveCanaryEnvInput(sink.url));
        try {
          const deliveredRequests = await waitFor(() =>
            sink.requests.length >= 4 ? sink.requests.slice(0, 4) : undefined
          );
          const recoveredReady = await waitFor(async () => {
            const response = await fetchJson<{
              ok: boolean;
              ready: boolean;
              state: string;
            }>(`${activeHost.baseUrl}/readyz`);
            return response.status === 200 ? response : undefined;
          });

          expect(deliveredRequests.map((request) => request.events[0]?.runSeq)).toEqual([
            1, 1, 2, 3,
          ]);
          expect(recoveredReady.body.ready).toBe(true);
          expect(recoveredReady.body.state).toMatch(/idle|draining/);
        } finally {
          await stopHost(activeHost);
        }
      });
    } finally {
      await sink.close();
    }
  });

  it('redelivers in order when markDelivered fails after publish', async () => {
    const sink = await startHttpSink();

    try {
      await withPatchedPostgresOutboxFixture(
        { retryDelayMs: 25, failMarkDeliveredRunSeqsOnce: [1] },
        async (fixture) => {
          await fixture.seedPending([makeRunQueuedEvent(1), makeRunQueuedEvent(2), makeRunQueuedEvent(3)]);

          const activeHost = await startHost(createActiveCanaryEnvInput(sink.url));
          try {
            const deliveredRequests = await waitFor(() =>
              sink.requests.length >= 4 ? sink.requests.slice(0, 4) : undefined
            );
            const deliveredMetrics = await waitFor(async () => {
              const response = await fetchText(`${activeHost.baseUrl}/metrics`);
              return /dvt_outbox_delivered_records_total 3/.test(response.body)
                ? response
                : undefined;
            });

            expect(deliveredRequests.map((request) => request.events[0]?.runSeq)).toEqual([
              1, 1, 2, 3,
            ]);
            expect(deliveredRequests.map((request) => request.events[0]?.eventId)).toEqual([
              'evt-canary-1',
              'evt-canary-1',
              'evt-canary-2',
              'evt-canary-3',
            ]);
            expect(deliveredRequests.map((request) => request.events[0]?.idempotencyKey)).toEqual([
              'key-canary-1',
              'key-canary-1',
              'key-canary-2',
              'key-canary-3',
            ]);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_retried_records_total 1/);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_delivered_records_total 3/);
          } finally {
            await stopHost(activeHost);
          }
        }
      );
    } finally {
      await sink.close();
    }
  });
});
