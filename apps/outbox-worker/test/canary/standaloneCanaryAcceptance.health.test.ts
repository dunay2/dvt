import { describe, expect, it } from 'vitest';

import { makeRunQueuedEvent } from './support/standaloneCanaryEventSupport.js';
import {
  createActiveCanaryEnvInput,
  createPassiveCanaryEnvInput,
  fetchJson,
  fetchText,
  startHost,
  stopHost,
  waitFor,
} from './support/standaloneCanaryHostSupport.js';
import { startHttpSink } from './support/standaloneCanaryHttpSink.js';
import { withPatchedPostgresOutboxFixture } from './support/standaloneCanaryOutboxFixture.js';

describe('standalone canary acceptance health and readiness', () => {
  it('reports passive readiness and metrics when ownership is passive', async () => {
    const passiveHost = await startHost(createPassiveCanaryEnvInput());

    try {
      const passiveHealth = await waitFor(async () => {
        const response = await fetchJson<{
          ok: boolean;
          state: string;
        }>(`${passiveHost.baseUrl}/healthz`);
        return response.body.state === 'passive' ? response : undefined;
      });
      const passiveReady = await fetchJson<{
        ok: boolean;
        ready: boolean;
        state: string;
      }>(`${passiveHost.baseUrl}/readyz`);
      const passiveMetrics = await fetchText(`${passiveHost.baseUrl}/metrics`);

      expect(passiveHealth.status).toBe(200);
      expect(passiveHealth.body.ok).toBe(true);
      expect(passiveReady.status).toBe(503);
      expect(passiveReady.body.ready).toBe(false);
      expect(passiveReady.body.state).toBe('passive');
      expect(passiveMetrics.body).toMatch(/dvt_outbox_runtime_ready 0/);
      expect(passiveMetrics.body).toMatch(/dvt_outbox_runtime_state\{state="passive"\} 1/);
    } finally {
      await stopHost(passiveHost);
    }
  });

  it('delivers a seeded event and reports stopped state after shutdown', async () => {
    const sink = await startHttpSink();

    try {
      await withPatchedPostgresOutboxFixture(async (fixture) => {
        const event = makeRunQueuedEvent();
        await fixture.seedPending([event]);

        const activeHost = await startHost(createActiveCanaryEnvInput(sink.url));
        try {
          const activeReady = await waitFor(async () => {
            const response = await fetchJson<{
              ok: boolean;
              ready: boolean;
              state: string;
            }>(`${activeHost.baseUrl}/readyz`);
            return response.status === 200 ? response : undefined;
          });
          const deliveredRequest = await waitFor(() =>
            sink.requests.length === 1 ? sink.requests[0] : undefined
          );
          const activeMetrics = await waitFor(async () => {
            const response = await fetchText(`${activeHost.baseUrl}/metrics`);
            return /dvt_outbox_delivered_records_total 1/.test(response.body)
              ? response
              : undefined;
          });

          expect(activeReady.body.ready).toBe(true);
          expect(activeMetrics.body).toMatch(/dvt_outbox_runtime_ready 1/);
          expect(activeMetrics.body).toMatch(
            /dvt_outbox_runtime_state\{state="(?:idle|draining)"\} 1/
          );
          expect(activeMetrics.body).toMatch(/dvt_outbox_delivered_records_total 1/);
          expect(activeMetrics.body).toMatch(/dvt_outbox_runtime_errors_total 0/);
          expect(deliveredRequest.events.length).toBe(1);
          expect(deliveredRequest.events[0]?.eventId).toBe(event.eventId);
          expect(deliveredRequest.events[0]?.runId).toBe(event.runId);
          expect(deliveredRequest.events[0]?.runSeq).toBe(event.runSeq);
        } finally {
          await stopHost(activeHost);
        }

        const finalSnapshot = activeHost.monitor.getHealthSnapshot();
        expect(finalSnapshot.state).toBe('stopped');
        expect(finalSnapshot.ok).toBe(false);
        expect(finalSnapshot.ready).toBe(false);
      });
    } finally {
      await sink.close();
    }
  });

  it('exposes failing readiness and retry metrics when downstream rejects delivery', async () => {
    const sink = await startHttpSink({
      statusCode: 503,
      responseBody: { error: 'synthetic downstream outage' },
    });

    try {
      await withPatchedPostgresOutboxFixture(async (fixture) => {
        const event = makeRunQueuedEvent();
        await fixture.seedPending([event]);

        const activeHost = await startHost(createActiveCanaryEnvInput(sink.url));
        try {
          const failingReady = await waitFor(async () => {
            const response = await fetchJson<{
              ok: boolean;
              ready: boolean;
              state: string;
              lastErrorMessage: string | null;
            }>(`${activeHost.baseUrl}/readyz`);
            return response.body.state === 'failing' ? response : undefined;
          });
          const failingMetrics = await waitFor(async () => {
            const response = await fetchText(`${activeHost.baseUrl}/metrics`);
            return /dvt_outbox_retried_records_total 1/.test(response.body) ? response : undefined;
          });

          expect(sink.requests.length).toBe(1);
          expect(failingReady.status).toBe(503);
          expect(failingReady.body.ready).toBe(false);
          expect(failingReady.body.state).toBe('failing');
          expect(failingReady.body.lastErrorMessage).toBe('HTTP_EVENT_BUS_BAD_STATUS: 503');
          expect(failingMetrics.body).toMatch(/dvt_outbox_runtime_ready 0/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_runtime_state\{state="failing"\} 1/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_delivered_records_total 0/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_retried_records_total 1/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_runtime_errors_total 0/);
        } finally {
          await stopHost(activeHost);
        }
      });
    } finally {
      await sink.close();
    }
  });
});
