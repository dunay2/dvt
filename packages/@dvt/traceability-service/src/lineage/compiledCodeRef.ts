/**
 * @ownedConcern Extract canonical compiled-code references from run-event payloads for lineage ingestion.
 */
import { createHash } from 'node:crypto';

import type { CompiledCodeRef } from '@dvt/contracts';

const COMPILED_SQL_ARTIFACT_KIND = 'compiled-sql';
const STEP_ARTIFACT_REF_PAYLOAD_KEY = 'stepArtifactRef';
const COMPILED_CODE_REF_PAYLOAD_KEY = 'compiledCodeRef';

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

function extractCompiledSqlArtifactRef(payload: Record<string, unknown>): CompiledCodeRef | null {
  const stepArtifactRef = payload[STEP_ARTIFACT_REF_PAYLOAD_KEY];
  if (!isRecord(stepArtifactRef)) {
    return null;
  }

  if (
    stepArtifactRef['artifactKind'] === COMPILED_SQL_ARTIFACT_KIND &&
    isCompiledCodeRef(stepArtifactRef)
  ) {
    return stepArtifactRef;
  }

  return null;
}

function extractDirectCompiledCodeRef(payload: Record<string, unknown>): CompiledCodeRef | null {
  const compiledCodeRef = payload[COMPILED_CODE_REF_PAYLOAD_KEY];
  return isCompiledCodeRef(compiledCodeRef) ? compiledCodeRef : null;
}

export function extractCompiledCodeRefFromPayload(payload: unknown): CompiledCodeRef | null {
  if (!isRecord(payload)) return null;

  return extractCompiledSqlArtifactRef(payload) ?? extractDirectCompiledCodeRef(payload);
}

export function sha256HexUtf8(input: string): string {
  return createHash('sha256').update(Buffer.from(input, 'utf8')).digest('hex');
}
