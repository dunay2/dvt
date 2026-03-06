import type { CompiledCodeRef } from '@dvt/contracts';

import type {
  ICompiledCodeCache,
  ICompiledCodeReader,
  ICompiledCodeResolver,
  ICompiledCodeRetryPolicy,
} from '../contracts.js';
import { CompiledCodeIntegrityError } from '../errors.js';
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
    const cacheKey = `${ref.sha256}|${ref.storageUri}`;
    const cached = this.deps.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    let attempt = 0;
    let lastError: unknown;
    while (attempt < this.retryPolicy.maxAttempts) {
      attempt += 1;
      try {
        const resolved = await this.deps.reader.read(ref);
        validateResolvedBlob(ref, resolved);
        this.deps.cache.set(cacheKey, resolved);
        return resolved;
      } catch (error) {
        lastError = error;
        if (attempt >= this.retryPolicy.maxAttempts) break;
        await sleep(backoffMs(attempt, this.retryPolicy));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

function validateResolvedBlob(ref: CompiledCodeRef, resolved: CompiledCodeBlob): void {
  if (resolved.sha256 !== ref.sha256) {
    throw new CompiledCodeIntegrityError(
      `Compiled code digest mismatch for ${ref.storageUri}: expected ${ref.sha256}, got ${resolved.sha256}`
    );
  }
  if (resolved.sizeBytes !== ref.sizeBytes) {
    throw new CompiledCodeIntegrityError(
      `Compiled code size mismatch for ${ref.storageUri}: expected ${ref.sizeBytes}, got ${resolved.sizeBytes}`
    );
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
