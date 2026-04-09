import { createHash } from 'node:crypto';

import type { CompiledCodeRef } from '@dvt/contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isCompiledCodeRef(value: unknown): value is CompiledCodeRef {
  if (!isRecord(value)) return false;

  const sha256 = value['sha256'];
  const storageUri = value['storageUri'];
  const sizeBytes = value['sizeBytes'];
  const encoding = value['encoding'];

  if (!isNonEmptyString(sha256)) return false;
  if (!/^[a-fA-F0-9]{64}$/.test(sha256)) return false;
  if (!isNonEmptyString(storageUri)) return false;
  if (!isPositiveInteger(sizeBytes)) return false;
  if (encoding !== undefined && encoding !== 'utf-8') return false;

  return true;
}

export function extractCompiledCodeRefFromPayload(payload: unknown): CompiledCodeRef | null {
  if (!isRecord(payload)) return null;
  const stepArtifactRef = payload['stepArtifactRef'];
  if (isRecord(stepArtifactRef)) {
    const artifactKind = stepArtifactRef['artifactKind'];
    if (
      (artifactKind === 'dbt.compiled-sql' || artifactKind === 'compiled-sql') &&
      isCompiledCodeRef(stepArtifactRef)
    ) {
      return stepArtifactRef;
    }
  }

  const compiledCodeRef = payload['compiledCodeRef'];
  return isCompiledCodeRef(compiledCodeRef) ? compiledCodeRef : null;
}

export function sha256HexUtf8(input: string): string {
  return createHash('sha256').update(Buffer.from(input, 'utf8')).digest('hex');
}
