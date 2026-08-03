'use strict';

function createRuntimeProofApiClient(options) {
  const request = (path, requestOptions = {}) =>
    requestJson({
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
      url: new URL(path, `${options.baseUrl}/`).href,
      bearerToken: options.bearerToken,
      timeoutMs: requestOptions.timeoutMs ?? options.timeoutMs,
      ...requestOptions,
    });

  return {
    saveDraft: (payload) =>
      request('/workspace/graph/draft', { method: 'PUT', payload, expectedStatuses: [200] }),
    previewPlan: (payload) =>
      request('/plans/preview', { method: 'POST', payload, expectedStatuses: [200] }),
    startRun: (payload, timeoutMs) =>
      request('/runs/start', {
        method: 'POST',
        payload,
        expectedStatuses: [202],
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
      }),
    getRun: (runId, tenantId) =>
      request(`/runs/${encodeURIComponent(runId)}?tenantId=${encodeURIComponent(tenantId)}`, {
        expectedStatuses: [200],
      }),
    listRunEvents: (runId, tenantId) =>
      request(
        `/runs/${encodeURIComponent(runId)}/events?tenantId=${encodeURIComponent(tenantId)}&afterSeq=0&limit=1000`,
        { expectedStatuses: [200] }
      ),
    rebuildSnapshot: (runId, tenantId) =>
      request(`/admin/runs/${encodeURIComponent(runId)}/rebuild-snapshot`, {
        method: 'POST',
        payload: { tenantId },
        expectedStatuses: [200],
      }),
  };
}

async function requestJson(options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  const startedAt = Date.now();

  try {
    const response = await options.fetchImpl(options.url, {
      method: options.method ?? 'GET',
      headers: {
        accept: 'application/json',
        ...(options.bearerToken === undefined
          ? {}
          : { authorization: `Bearer ${options.bearerToken}` }),
        ...(options.payload === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(options.payload === undefined ? {} : { body: JSON.stringify(options.payload) }),
      signal: controller.signal,
    });
    const bodyText = await response.text();
    const body = bodyText.length === 0 ? null : parseJson(bodyText, options.url);
    const expectedStatuses = options.expectedStatuses ?? [200];
    if (!expectedStatuses.includes(response.status)) {
      const error = new Error(
        `Runtime proof request ${options.method ?? 'GET'} ${options.url} returned ${response.status}`
      );
      error.statusCode = response.status;
      error.responseBody = body;
      throw error;
    }

    return { statusCode: response.status, body, durationMs: Date.now() - startedAt };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Runtime proof request timed out after ${options.timeoutMs ?? 15_000}ms`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Runtime proof endpoint ${url} returned invalid JSON`, { cause: error });
  }
}

module.exports = { createRuntimeProofApiClient, requestJson };
