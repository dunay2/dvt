import { createHash } from 'node:crypto';

import type { StepDefinition, StepExecutionContext } from '@dvt/adapter-temporal';
import { describe, expect, it, vi } from 'vitest';

import {
  createHttpJsonArtifactPluginProfile,
  HttpJsonArtifactAcquisitionRejectedError,
  HttpJsonArtifactPluginRunner,
  HTTP_JSON_ARTIFACT_PLUGIN_ID,
} from '../src/index.js';

const BYTES = Buffer.from('{"order_id":1}\n', 'utf8');
const SHA256 = createHash('sha256').update(BYTES).digest('hex');
const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;
const STORAGE_URI = `s3://het2-artifacts/tenants/${SCOPE.tenantId}/${SHA256}`;
const CONFIG = {
  scope: SCOPE,
  request: {
    method: 'GET' as const,
    endpointRef: 'http-endpoint:orders-snapshot',
    headers: { accept: 'application/x-ndjson' as const },
    authCredentialRef: 'http-auth:orders-snapshot',
  },
  response: {
    acceptedStatus: 200 as const,
    format: 'jsonl' as const,
    mediaType: 'application/x-ndjson' as const,
    encoding: 'utf-8' as const,
    expectedSha256: SHA256,
    expectedSizeBytes: BYTES.byteLength,
    maxBytes: 1_000_000,
  },
  artifact: {
    storageUri: STORAGE_URI,
    credentialRef: 'object-store:het2-artifacts',
  },
  limits: { connectTimeoutMs: 1_000, requestTimeoutMs: 5_000, maxRedirects: 1 },
};
const CONTEXT: StepExecutionContext = {
  executionIdentity: {
    tenantId: SCOPE.tenantId,
    runId: 'run-a',
    environmentId: SCOPE.environmentId,
  },
  runContext: { ...SCOPE, runId: 'run-a', targetAdapter: 'temporal', logicalAttemptId: 1 },
};

describe('HTTP JSON artifact Temporal profile', () => {
  it('registers only the canonical acquisition kind and rejects malformed config permanently', async () => {
    const execute = vi.fn();
    const profile = createHttpJsonArtifactPluginProfile({ execute });

    expect(profile.pluginId).toBe(HTTP_JSON_ARTIFACT_PLUGIN_ID);
    expect([...profile.stepActivitiesByKind.keys()]).toEqual(['ACQUIRE_HTTP_JSON_ARTIFACT']);
    await expect(
      profile.stepActivitiesByKind.get('ACQUIRE_HTTP_JSON_ARTIFACT')?.execute(step({}), CONTEXT)
    ).rejects.toMatchObject({ nonRetryable: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('fetches by opaque refs, publishes once, and returns receipt-only evidence', async () => {
    const acquire = vi.fn(async () => ({
      bytes: Uint8Array.from(BYTES),
      statusCode: 200,
      mediaType: 'application/x-ndjson',
      redirectCount: 0,
    }));
    const publish = vi.fn(async () => ({
      disposition: 'created' as const,
      storageUri: STORAGE_URI,
      sha256: SHA256,
      sizeBytes: BYTES.byteLength,
      mediaType: 'application/x-ndjson',
    }));
    const runner = new HttpJsonArtifactPluginRunner({
      client: { acquire },
      artifactStore: { publish },
      expectedArtifactCredentialRef: 'object-store:het2-artifacts',
      now: vi
        .fn<() => Date>()
        .mockReturnValueOnce(new Date('2026-08-05T00:00:00.000Z'))
        .mockReturnValueOnce(new Date('2026-08-05T00:00:00.025Z')),
    });

    const result = await runner.execute({
      step: step(CONFIG),
      config: CONFIG,
      executionIdentity: CONTEXT.executionIdentity,
      runContext: CONTEXT.runContext,
    });

    expect(acquire).toHaveBeenCalledWith(
      expect.objectContaining({
        endpointRef: CONFIG.request.endpointRef,
        authCredentialRef: CONFIG.request.authCredentialRef,
      })
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ storageUri: STORAGE_URI, bytes: Uint8Array.from(BYTES) })
    );
    expect(result.resultEvidence).toEqual({
      evidenceType: 'artifact-acquisition',
      environmentId: SCOPE.environmentId,
      endpointRef: CONFIG.request.endpointRef,
      artifact: {
        storageUri: STORAGE_URI,
        sha256: SHA256,
        sizeBytes: BYTES.byteLength,
        mediaType: 'application/x-ndjson',
      },
      publicationOutcome: 'created',
      statusCode: 200,
      redirectCount: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      completedAt: '2026-08-05T00:00:00.025Z',
      durationMs: 25,
    });
    expect(JSON.stringify(result)).not.toContain('{\\"order_id\\"');
    expect(JSON.stringify(result)).not.toContain('https://');
  });

  it('rejects scope, binding, and response identity drift before publication', async () => {
    const acquire = vi.fn(async () => ({
      bytes: Uint8Array.from(Buffer.from('{"order_id":2}\n', 'utf8')),
      statusCode: 200,
      mediaType: 'application/x-ndjson',
      redirectCount: 0,
    }));
    const publish = vi.fn();
    const runner = new HttpJsonArtifactPluginRunner({
      client: { acquire },
      artifactStore: { publish },
      expectedArtifactCredentialRef: 'object-store:het2-artifacts',
    });

    await expect(
      runner.execute({
        step: step(CONFIG),
        config: CONFIG,
        executionIdentity: CONTEXT.executionIdentity,
        runContext: CONTEXT.runContext,
      })
    ).rejects.toBeInstanceOf(HttpJsonArtifactAcquisitionRejectedError);
    expect(publish).not.toHaveBeenCalled();

    await expect(
      runner.execute({
        step: step(CONFIG),
        config: {
          ...CONFIG,
          artifact: { ...CONFIG.artifact, credentialRef: 'object-store:other' },
        },
        executionIdentity: CONTEXT.executionIdentity,
        runContext: CONTEXT.runContext,
      })
    ).rejects.toMatchObject({ code: 'HTTP_JSON_ARTIFACT_BINDING_MISMATCH' });
  });
});

function step(config: unknown): StepDefinition {
  return {
    stepId: 'acquire.orders',
    kind: 'ACQUIRE_HTTP_JSON_ARTIFACT',
    dependsOn: [],
    stepTypeConfig: config,
  } as StepDefinition;
}
