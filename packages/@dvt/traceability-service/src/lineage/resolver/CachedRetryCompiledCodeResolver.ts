import { validateArtifactIntegrity } from '@dvt/artifacts';
import {
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
  type CompiledCodeRef,
} from '@dvt/contracts';

import type {
  ICompiledCodeCache,
  ICompiledCodeReader,
  ICompiledCodeResolver,
  ICompiledCodeRetryPolicy,
} from '../contracts.js';
import { LINEAGE_ERROR_REASON_CODE } from '../errorContract.js';
import {
  CompiledCodeIntegrityError,
  CompiledCodeNotFoundError,
  CompiledCodeUnsupportedSchemeError,
} from '../errors.js';
import type { CompiledCodeBlob } from '../types.js';

export interface CachedRetryCompiledCodeResolverDeps {
  reader: ICompiledCodeReader;
  cache: ICompiledCodeCache;
  retryPolicy?: Partial<ICompiledCodeRetryPolicy>;
}

const DEFAULT_RETRY_POLICY: ICompiledCodeRetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 30,
  maxDelayMs: 250,
};

export class CachedRetryCompiledCodeResolver implements ICompiledCodeResolver {
  private readonly retryPolicy: ICompiledCodeRetryPolicy;

  constructor(private readonly deps: CachedRetryCompiledCodeResolverDeps) {
    this.retryPolicy = {
      maxAttempts: deps.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
      initialDelayMs: deps.retryPolicy?.initialDelayMs ?? DEFAULT_RETRY_POLICY.initialDelayMs,
      maxDelayMs: deps.retryPolicy?.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs,
    };
  }

  async resolve(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    const cacheKey = buildCompiledCodeCacheKey(ref);
    const cached = this.deps.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const resolved = await this.readWithRetry(ref);
    assertResolvedArtifactMatchesReference(ref, resolved);
    this.deps.cache.set(cacheKey, resolved);
    return resolved;
  }

  private async readWithRetry(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.retryPolicy.maxAttempts) {
      attempt += 1;
      try {
        return await this.deps.reader.read(ref);
      } catch (error) {
        lastError = error;
        if (isNonRetryableCompiledCodeError(error) || attempt >= this.retryPolicy.maxAttempts) {
          break;
        }
        await sleep(backoffMs(attempt, this.retryPolicy));
      }
    }

    throw toCompiledCodeResolutionError(ref, lastError);
  }
}

function buildCompiledCodeCacheKey(ref: CompiledCodeRef): string {
  return `${ref.sha256}|${ref.storageUri}`;
}

function assertResolvedArtifactMatchesReference(
  ref: CompiledCodeRef,
  resolved: CompiledCodeBlob
): void {
  try {
    validateArtifactIntegrity(
      { sha256: ref.sha256, sizeBytes: ref.sizeBytes },
      { sha256: resolved.sha256, sizeBytes: resolved.sizeBytes }
    );
  } catch (error) {
    throw toCompiledCodeResolutionError(ref, error);
  }
}

function backoffMs(attempt: number, policy: ICompiledCodeRetryPolicy): number {
  const exponential = policy.initialDelayMs * 2 ** (attempt - 1);
  return Math.min(exponential, policy.maxDelayMs);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error('UNKNOWN_COMPILED_CODE_RESOLUTION_ERROR');
  }
}

function toCompiledCodeResolutionError(ref: CompiledCodeRef, value: unknown): Error {
  if (value instanceof CompiledCodeIntegrityError) {
    return value;
  }

  if (isArtifactIntegrityError(value)) {
    const reasonCode = toCompiledCodeIntegrityReasonCode(value);
    return new CompiledCodeIntegrityError({
      cause: value,
      reason: value.message,
      ...(reasonCode ? { reasonCode } : {}),
      storageUri: ref.storageUri,
    });
  }

  return toError(value);
}

function isArtifactIntegrityError(value: unknown): value is Error & {
  code: typeof CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR;
  messageKey?: unknown;
} {
  const errorWithCode = value as Error & { code?: unknown };

  return (
    value instanceof Error &&
    typeof errorWithCode.code === 'string' &&
    errorWithCode.code === CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR
  );
}

function toCompiledCodeIntegrityReasonCode(
  value: Error & { messageKey?: unknown }
):
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_INTEGRITY_DIGEST_MISMATCH
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_INTEGRITY_SIZE_MISMATCH
  | undefined {
  switch (value.messageKey) {
    case CONTRACTS_ERROR_MESSAGE_KEY.ARTIFACT_INTEGRITY_DIGEST_MISMATCH:
      return LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_INTEGRITY_DIGEST_MISMATCH;
    case CONTRACTS_ERROR_MESSAGE_KEY.ARTIFACT_INTEGRITY_SIZE_MISMATCH:
      return LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_INTEGRITY_SIZE_MISMATCH;
    default:
      return undefined;
  }
}

function isNonRetryableCompiledCodeError(value: unknown): boolean {
  return (
    value instanceof CompiledCodeIntegrityError ||
    value instanceof CompiledCodeNotFoundError ||
    value instanceof CompiledCodeUnsupportedSchemeError
  );
}
