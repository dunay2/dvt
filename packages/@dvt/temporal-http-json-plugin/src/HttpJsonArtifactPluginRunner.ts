import { createHash } from 'node:crypto';

import type { StepResult } from '@dvt/adapter-temporal';
import { ArtifactAcquisitionEvidenceSchema, ArtifactStoreError } from '@dvt/contracts';

import {
  HttpJsonArtifactAcquisitionRejectedError,
  HttpJsonArtifactAcquisitionRuntimeError,
} from './httpJsonArtifactPluginErrors.js';
import type {
  HttpJsonAcquisitionClient,
  HttpJsonArtifactPluginExecutionInput,
  HttpJsonArtifactPluginRunnerPort,
  HttpJsonArtifactStore,
} from './httpJsonArtifactPluginTypes.js';

export interface HttpJsonArtifactPluginRunnerOptions {
  readonly client: HttpJsonAcquisitionClient;
  readonly artifactStore: HttpJsonArtifactStore;
  readonly expectedArtifactCredentialRef: string;
  readonly getCancellationSignal?: () => globalThis.AbortSignal | undefined;
  readonly now?: () => Date;
}

export class HttpJsonArtifactPluginRunner implements HttpJsonArtifactPluginRunnerPort {
  private readonly getCancellationSignal: () => globalThis.AbortSignal | undefined;
  private readonly now: () => Date;

  public constructor(private readonly options: HttpJsonArtifactPluginRunnerOptions) {
    this.getCancellationSignal = options.getCancellationSignal ?? (() => undefined);
    this.now = options.now ?? (() => new Date());
  }

  public async execute(input: HttpJsonArtifactPluginExecutionInput): Promise<StepResult> {
    assertScope(input);
    if (input.config.artifact.credentialRef !== this.options.expectedArtifactCredentialRef) {
      reject('HTTP_JSON_ARTIFACT_BINDING_MISMATCH');
    }

    const signal = this.getCancellationSignal();
    assertNotAborted(signal);
    const startedAt = this.now();
    const response = await acquireSafely(this.options.client, input, signal);
    validateResponse(input, response);
    assertNotAborted(signal);
    const published = await publishSafely(
      this.options.artifactStore,
      input,
      response.bytes,
      signal
    );
    assertNotAborted(signal);
    const completedAt = this.now();

    return {
      stepId: input.step.stepId,
      status: 'COMPLETED',
      resultEvidence: ArtifactAcquisitionEvidenceSchema.parse({
        evidenceType: 'artifact-acquisition',
        environmentId: input.runContext.environmentId,
        endpointRef: input.config.request.endpointRef,
        artifact: {
          storageUri: published.storageUri,
          sha256: published.sha256,
          sizeBytes: published.sizeBytes,
          mediaType: published.mediaType,
        },
        publicationOutcome: published.disposition,
        statusCode: 200,
        redirectCount: response.redirectCount,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      }),
    };
  }
}

function assertScope(input: HttpJsonArtifactPluginExecutionInput): void {
  const expected = input.config.scope;
  const actual = input.runContext;
  if (
    expected.tenantId !== actual.tenantId ||
    expected.projectId !== actual.projectId ||
    expected.environmentId !== actual.environmentId ||
    input.executionIdentity.tenantId !== actual.tenantId ||
    input.executionIdentity.environmentId !== actual.environmentId
  ) {
    reject('HTTP_JSON_EXECUTION_SCOPE_MISMATCH');
  }
}

async function acquireSafely(
  client: HttpJsonAcquisitionClient,
  input: HttpJsonArtifactPluginExecutionInput,
  signal: globalThis.AbortSignal | undefined
): Promise<Awaited<ReturnType<HttpJsonAcquisitionClient['acquire']>>> {
  try {
    return await client.acquire({
      endpointRef: input.config.request.endpointRef,
      ...(input.config.request.authCredentialRef === undefined
        ? {}
        : { authCredentialRef: input.config.request.authCredentialRef }),
      accept: input.config.response.mediaType,
      format: input.config.response.format,
      acceptedStatus: input.config.response.acceptedStatus,
      maxBytes: input.config.response.maxBytes,
      connectTimeoutMs: input.config.limits.connectTimeoutMs,
      requestTimeoutMs: input.config.limits.requestTimeoutMs,
      maxRedirects: input.config.limits.maxRedirects,
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error) {
    rethrowCancellation(signal, error);
    if (error instanceof HttpJsonArtifactAcquisitionRejectedError) throw error;
    throw new HttpJsonArtifactAcquisitionRuntimeError('HTTP_JSON_ACQUISITION_FAILED');
  }
}

function validateResponse(
  input: HttpJsonArtifactPluginExecutionInput,
  response: Awaited<ReturnType<HttpJsonAcquisitionClient['acquire']>>
): void {
  const expected = input.config.response;
  if (response.statusCode !== expected.acceptedStatus) reject('HTTP_JSON_STATUS_MISMATCH');
  if (normalizeMediaType(response.mediaType) !== expected.mediaType) {
    reject('HTTP_JSON_MEDIA_TYPE_MISMATCH');
  }
  if (response.redirectCount < 0 || response.redirectCount > input.config.limits.maxRedirects) {
    reject('HTTP_JSON_REDIRECT_LIMIT_EXCEEDED');
  }
  if (
    response.bytes.byteLength !== expected.expectedSizeBytes ||
    response.bytes.byteLength > expected.maxBytes
  ) {
    reject('HTTP_JSON_SIZE_MISMATCH');
  }
  const actualSha256 = createHash('sha256').update(response.bytes).digest('hex');
  if (actualSha256 !== expected.expectedSha256) reject('HTTP_JSON_INTEGRITY_MISMATCH');
  validateJson(response.bytes, expected.format);
}

function validateJson(bytes: Uint8Array, format: 'json' | 'jsonl'): void {
  let text: string;
  try {
    text = new globalThis.TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (format === 'json') {
      JSON.parse(text);
      return;
    }
    const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
    if (lines.length === 0) reject('HTTP_JSON_PAYLOAD_INVALID');
    for (const line of lines) JSON.parse(line);
  } catch (error) {
    if (error instanceof HttpJsonArtifactAcquisitionRejectedError) throw error;
    reject('HTTP_JSON_PAYLOAD_INVALID');
  }
}

async function publishSafely(
  store: HttpJsonArtifactStore,
  input: HttpJsonArtifactPluginExecutionInput,
  bytes: Uint8Array,
  signal: globalThis.AbortSignal | undefined
): Promise<Awaited<ReturnType<HttpJsonArtifactStore['publish']>>> {
  try {
    return await store.publish({
      tenantId: input.config.scope.tenantId,
      storageUri: input.config.artifact.storageUri,
      sha256: input.config.response.expectedSha256,
      sizeBytes: input.config.response.expectedSizeBytes,
      mediaType: input.config.response.mediaType,
      bytes,
      ...(signal === undefined ? {} : { abortSignal: signal }),
    });
  } catch (error) {
    rethrowCancellation(signal, error);
    if (
      error instanceof ArtifactStoreError &&
      error.code !== 'ARTIFACT_UPLOAD_FAILED' &&
      error.code !== 'ARTIFACT_NOT_FOUND'
    ) {
      reject('HTTP_JSON_ARTIFACT_CONFLICT');
    }
    throw new HttpJsonArtifactAcquisitionRuntimeError('HTTP_JSON_ARTIFACT_PUBLISH_FAILED');
  }
}

function normalizeMediaType(value: string): string {
  return value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) throw signal.reason ?? new Error('HTTP JSON acquisition cancelled');
}

function rethrowCancellation(
  signal: globalThis.AbortSignal | undefined,
  operationError: unknown
): void {
  if (signal?.aborted === true) throw signal.reason ?? operationError;
}

function reject(code: string): never {
  throw new HttpJsonArtifactAcquisitionRejectedError(code);
}
