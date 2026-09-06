import {
  parseRunExecutionContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
} from '@dvt/contracts';

import type { IRunExecutionContextReader } from '../ports/IRunExecutionContextReader.js';

import { ArtifactReadError } from './ArtifactReadError.js';
import { type ArtifactReadRuntimeOptions } from './readArtifactBytes.js';
import { readVerifiedArtifactBytes } from './readVerifiedArtifactBytes.js';

const ARTIFACT_LABEL = 'runExecutionContext';
const URI_LABEL = 'runExecutionContextRef';

export type ArtifactBackedRunExecutionContextReaderOptions = ArtifactReadRuntimeOptions;

export class ArtifactBackedRunExecutionContextReader implements IRunExecutionContextReader {
  public constructor(private readonly options?: ArtifactBackedRunExecutionContextReaderOptions) {}

  public async resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext> {
    const bytes = await readVerifiedArtifactBytes(
      {
        storageUri: ref.uri,
        sha256: ref.sha256,
      },
      {
        artifactLabel: ARTIFACT_LABEL,
        uriLabel: URI_LABEL,
        ...this.options,
      }
    );
    const resolved = parseRunExecutionContextArtifact(bytes);

    assertRefAlignment(ref, resolved);
    return resolved;
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
