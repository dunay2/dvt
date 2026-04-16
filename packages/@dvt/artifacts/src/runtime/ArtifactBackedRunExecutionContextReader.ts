import {
  parseRunExecutionContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
} from '@dvt/contracts';

import { computeSha256 } from '../compiledCode/sha256.js';
import type { IRunExecutionContextReader } from '../ports/IRunExecutionContextReader.js';

import { ArtifactReadError } from './ArtifactReadError.js';
import { readArtifactBytes, type ArtifactReadRuntimeOptions } from './readArtifactBytes.js';

const ARTIFACT_LABEL = 'runExecutionContext';
const URI_LABEL = 'runExecutionContextRef';

export type ArtifactBackedRunExecutionContextReaderOptions = ArtifactReadRuntimeOptions;

export class ArtifactBackedRunExecutionContextReader implements IRunExecutionContextReader {
  public constructor(private readonly options?: ArtifactBackedRunExecutionContextReaderOptions) {}

  public async resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext> {
    const bytes = await readArtifactBytes(ref.uri, {
      artifactLabel: ARTIFACT_LABEL,
      uriLabel: URI_LABEL,
      ...this.options,
    });
    assertSha256(bytes, ref.sha256);
    const resolved = parseRunExecutionContextArtifact(bytes);

    assertRefAlignment(ref, resolved);
    return resolved;
  }
}

function assertSha256(bytes: Uint8Array, expectedSha256: string): void {
  const actualSha256 = computeSha256(Buffer.from(bytes));
  if (actualSha256 !== expectedSha256) {
    throw new ArtifactReadError(
      'ARTIFACT_INTEGRITY_MISMATCH',
      'runExecutionContext artifact integrity mismatch'
    );
  }
}

function parseRunExecutionContextArtifact(bytes: Uint8Array): RunExecutionContext {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    throw new ArtifactReadError(
      'ARTIFACT_PAYLOAD_INVALID',
      'runExecutionContext artifact payload is invalid',
      {
        cause: error,
      }
    );
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ArtifactReadError(
      'ARTIFACT_PAYLOAD_INVALID',
      'runExecutionContext artifact payload is invalid'
    );
  }

  try {
    return parseRunExecutionContext(parsed);
  } catch (error) {
    throw new ArtifactReadError(
      'ARTIFACT_PAYLOAD_INVALID',
      'runExecutionContext artifact payload is invalid',
      { cause: error }
    );
  }
}

function assertRefAlignment(ref: RunExecutionContextRef, resolved: RunExecutionContext): void {
  if (resolved.schemaVersion !== ref.schemaVersion) {
    throw new ArtifactReadError(
      'ARTIFACT_REF_MISMATCH',
      `runExecutionContext.schemaVersion mismatch: ref=${ref.schemaVersion} actual=${resolved.schemaVersion}`
    );
  }
  if (resolved.planId !== ref.planId) {
    throw new ArtifactReadError(
      'ARTIFACT_REF_MISMATCH',
      `runExecutionContext.planId mismatch: ref=${ref.planId} actual=${resolved.planId}`
    );
  }
  if (resolved.planVersion !== ref.planVersion) {
    throw new ArtifactReadError(
      'ARTIFACT_REF_MISMATCH',
      `runExecutionContext.planVersion mismatch: ref=${ref.planVersion} actual=${resolved.planVersion}`
    );
  }
  if (
    ref.pluginCompatibilityFingerprint !== undefined &&
    resolved.pluginCompatibilityFingerprint === undefined
  ) {
    throw new ArtifactReadError(
      'ARTIFACT_REF_MISMATCH',
      'runExecutionContext.pluginCompatibilityFingerprint missing in resolved artifact'
    );
  }
  if (
    ref.pluginCompatibilityFingerprint !== undefined &&
    resolved.pluginCompatibilityFingerprint !== undefined &&
    resolved.pluginCompatibilityFingerprint !== ref.pluginCompatibilityFingerprint
  ) {
    throw new ArtifactReadError(
      'ARTIFACT_REF_MISMATCH',
      'runExecutionContext.pluginCompatibilityFingerprint mismatch between ref and resolved artifact'
    );
  }
}
