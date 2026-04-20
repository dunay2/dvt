import { describe, expect, it } from 'vitest';

import { makeRunQueuedEvent } from './support/standaloneCanaryEventSupport.js';
import {
  createActiveCanaryEnvInput,
  fetchText,
  startHost,
  stopHost,
  waitFor,
} from './support/standaloneCanaryHostSupport.js';
import { startHttpSink } from './support/standaloneCanaryHttpSink.js';
import { withPatchedPostgresOutboxFixture } from './support/standaloneCanaryOutboxFixture.js';

describe('standalone canary acceptance idempotent sink behavior', () => {
  it('shows an idempotent downstream sink absorbing duplicate redelivery', async () => {
    const sink = await startHttpSink({
      idempotentBy: 'eventId',
    });

    try {
      await withPatchedPostgresOutboxFixture(
        { retryDelayMs: 25, failMarkDeliveredRunSeqsOnce: [1] },
        async (fixture) => {
          await fixture.seedPending([makeRunQueuedEvent(1), makeRunQueuedEvent(2)]);

          const activeHost = await startHost(createActiveCanaryEnvInput(sink.url));
          try {
            const deliveredRequests = await waitFor(() =>
              sink.requests.length >= 3 ? sink.requests.slice(0, 3) : undefined
            );
            const appliedEffects = await waitFor(() =>
              sink.appliedEffects.length >= 2 ? sink.appliedEffects.slice(0, 2) : undefined
            );
            const deliveredMetrics = await waitFor(async () => {
              const response = await fetchText(`${activeHost.baseUrl}/metrics`);
              return /dvt_outbox_delivered_records_total 2/.test(response.body)
                ? response
                : undefined;
            });

            expect(deliveredRequests.map((request) => request.events[0]?.eventId)).toEqual([
              'evt-canary-1',
              'evt-canary-1',
              'evt-canary-2',
            ]);
            expect(deliveredRequests.map((request) => request.events[0]?.idempotencyKey)).toEqual([
              'key-canary-1',
              'key-canary-1',
              'key-canary-2',
            ]);
            expect(appliedEffects.map((event) => event.eventId)).toEqual([
              'evt-canary-1',
              'evt-canary-2',
            ]);
            expect(sink.duplicateKeys).toEqual(['evt-canary-1']);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_retried_records_total 1/);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_delivered_records_total 2/);
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
