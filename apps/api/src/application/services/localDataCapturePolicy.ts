/**
 * Owned concern: validate capture intent and derive immutable evidence without I/O.
 * @baseline #3394: Source/Capture/Generation identities and coverage remain in contracts.
 * @decision Keep parsing, batch ownership and manifest derivation outside orchestration.
 * @consequence Structural snapshots are not provider type validation, authorization or publication.
 */
import {
  ConnectedSourceRefSchema,
  LocalDataAcquisitionPolicyV1Schema,
  LocalDataAcquisitionRequestV1Schema,
  LocalDataCaptureIdV1Schema,
  LocalDataGenerationIdV1Schema,
  LocalDataGenerationManifestV1Schema,
  LocalDatasetIdV1Schema,
  createLocalDataRequestFingerprintV1,
  createLocalDataSchemaDigestV1,
  type LocalDataAcquisitionRequestV1,
  type LocalDataSchemaV1,
} from '@dvt/contracts';

import type { RemoteDatasetBatch } from '../ports/localDataAcquisition.js';

type CaptureFailure =
  | 'INVALID_INPUT' | 'SOURCE_REJECTED' | 'SOURCE_BINDING_CHANGED' | 'CANCELLED'
  | 'CAPTURE_BUDGET' | 'CAPTURE_TIMEOUT' | 'INVALID_BATCH' | 'INVALID_EVIDENCE';

export class LocalDataCaptureError extends Error {
  public constructor(readonly code: CaptureFailure) {
    super(`LOCAL capture rejected: ${code}`);
    this.name = 'LocalDataCaptureError';
  }
}

// Reuse each public parse boundary; do not combine schemas from different Zod majors.
export function parseCaptureCommand(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new LocalDataCaptureError('INVALID_INPUT');
  }
  const value = input as Record<string, unknown>;
  const fields = ['localDatasetId', 'captureId', 'sourceRef', 'policy',
    'expectedHeadGenerationId', 'expectedPublicationToken'];
  if (Object.keys(value).some((key) => !fields.includes(key))) {
    throw new LocalDataCaptureError('INVALID_INPUT');
  }
  const token = value.expectedPublicationToken;
  if (token !== undefined && (typeof token !== 'string' || !/^[0-9a-f]{64}$/u.test(token))) {
    throw new LocalDataCaptureError('INVALID_INPUT');
  }
  try {
    const sourceRef = ConnectedSourceRefSchema.parse(value.sourceRef);
    Object.freeze(sourceRef.connectionRef);
    Object.freeze(sourceRef);
    return Object.freeze({
      localDatasetId: LocalDatasetIdV1Schema.parse(value.localDatasetId),
      captureId: LocalDataCaptureIdV1Schema.parse(value.captureId),
      sourceRef,
      policy: Object.freeze(LocalDataAcquisitionPolicyV1Schema.parse(value.policy)),
      expectedHeadGenerationId: LocalDataGenerationIdV1Schema.nullable().parse(value.expectedHeadGenerationId),
      ...(token === undefined ? {} : { expectedPublicationToken: token }),
    });
  } catch {
    throw new LocalDataCaptureError('INVALID_INPUT');
  }
}
export type CaptureCommand = ReturnType<typeof parseCaptureCommand>;
export type CaptureEvidence = Readonly<{
  request: LocalDataAcquisitionRequestV1;
  generationId: string;
  observedAt: string;
  rows: bigint;
  bytes: bigint;
  eof: boolean;
}>;

export function createCaptureRequest(
  command: CaptureCommand, schema: LocalDataSchemaV1, providerContextSha256: string
): LocalDataAcquisitionRequestV1 {
  const request = LocalDataAcquisitionRequestV1Schema.parse({
    schemaVersion: 'local-data-acquisition-request.v1', sourceRef: command.sourceRef,
    policy: command.policy, schema, providerContextSha256,
  });
  Object.freeze(request.sourceRef.connectionRef);
  Object.freeze(request.sourceRef);
  Object.freeze(request.policy);
  request.schema.columns.forEach(Object.freeze);
  Object.freeze(request.schema.columns);
  Object.freeze(request.schema);
  return Object.freeze(request);
}

/** Own row containers and primitive evidence before any callback; adapters still validate cell types. */
export function snapshotCaptureBatch(
  input: RemoteDatasetBatch, requested: number, columnCount: number
): RemoteDatasetBatch {
  if (!input) throw new LocalDataCaptureError('INVALID_BATCH');
  const { rows, logicalBytes, endOfSource } = input;
  if (!Array.isArray(rows) || rows.length > requested || typeof endOfSource !== 'boolean' ||
      !Number.isSafeInteger(logicalBytes) || logicalBytes < 0 ||
      (rows.length === 0 && (!endOfSource || logicalBytes !== 0))) {
    throw new LocalDataCaptureError('INVALID_BATCH');
  }
  const ownedRows = Array.from(rows, (row) => {
    if (!Array.isArray(row) || row.length !== columnCount) {
      throw new LocalDataCaptureError('INVALID_BATCH');
    }
    return Object.freeze(Array.from(row));
  });
  return Object.freeze({ rows: Object.freeze(ownedRows), logicalBytes, endOfSource });
}

export function createCaptureManifest(
  command: CaptureCommand, evidence: CaptureEvidence, createdAt: string
) {
  if (command.policy.kind === 'full' && !evidence.eof) {
    throw new LocalDataCaptureError('INVALID_EVIDENCE');
  }
  return LocalDataGenerationManifestV1Schema.parse({
    schemaVersion: 'local-data-generation.v1', localDatasetId: command.localDatasetId,
    captureId: command.captureId, generationId: evidence.generationId,
    request: evidence.request, requestFingerprint: createLocalDataRequestFingerprintV1(evidence.request),
    schemaSha256: createLocalDataSchemaDigestV1(evidence.request.schema),
    coverage: command.policy.kind === 'full' ? { kind: 'full', eofObserved: true } : { kind: 'sample' },
    completionReason: evidence.eof ? 'source-exhausted' : 'sample-target-reached',
    rowCount: evidence.rows.toString(), logicalByteCount: evidence.bytes.toString(),
    sourceObservation: { observedAt: evidence.observedAt }, createdAt,
  });
}
