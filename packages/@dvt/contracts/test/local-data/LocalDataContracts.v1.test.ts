/** Contract integration tests: run with the repository's real Zod/crypto/Vitest dependencies. */
import { describe, expect, it } from 'vitest';

import * as publicContracts from '../../src/index.js';
import {
  LocalDatasetIdV1Schema, LocalDataCaptureIdV1Schema, LocalDataGenerationIdV1Schema,
  LocalDataSchemaV1Schema, LocalDataAcquisitionRequestV1Schema,
  LocalDataGenerationManifestV1Schema, LocalDataCaptureRecordV1Schema,
  createLocalDatasetIdV1, createLocalDataCaptureIdV1, createLocalDataGenerationIdV1,
  createLocalDataSchemaDigestV1, createLocalDataRequestFingerprintV1,
  isLocalDataCaptureTransitionAllowedV1, matchesLocalDataCaptureCompletionV1,
  matchesLocalDataGenerationSelectionV1,
} from '../../src/contracts/local-data/index.js';
import { DataAccessSelectionSchema, WorkingDataCoverageSchema, isWorkingDataTransitionAllowed } from '../../src/contracts/data-access/DataAccess.v1.js';

const uuid = '0198f001-1111-7222-8333-444444444444';
const datasetId = `dvt_lds_${uuid}`;
const captureId = `dvt_cap_${uuid}`;
const generationId = `dvt_gen_${uuid}`;
const nextUuid = '0198f001-1111-7222-8333-555555555555';

function rawSchema() {
  return {
    schemaVersion: 'local-data-schema.v1',
    columns: [
      { ordinal: 0, name: 'id', sourceType: 'bigint', localType: 'BIGINT', nullable: false },
      { ordinal: 1, name: 'amount', sourceType: 'numeric(18,2)', localType: 'DECIMAL(18,2)', nullable: true },
    ],
  };
}
function rawRequest(sample = false) {
  return {
    schemaVersion: 'local-data-acquisition-request.v1',
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: { schemaVersion: 'connection-ref.v1', connectionId: 'crm', provider: 'postgres' },
      sourceObjectId: 'relation/crm/public/customers',
    },
    policy: sample ? { kind: 'sample', method: 'first', requestedRows: '10' } : { kind: 'full' },
    schema: rawSchema(), providerContextSha256: 'a'.repeat(64),
  };
}
function rawManifest(sample = false) {
  const request = rawRequest(sample);
  return {
    schemaVersion: 'local-data-generation.v1', localDatasetId: datasetId, captureId, generationId,
    request, requestFingerprint: createLocalDataRequestFingerprintV1(request),
    schemaSha256: createLocalDataSchemaDigestV1(request.schema),
    coverage: sample ? { kind: 'sample' } : { kind: 'full', eofObserved: true },
    completionReason: 'source-exhausted', rowCount: '3', logicalByteCount: '100',
    sourceObservation: { observedAt: '2026-10-16T10:00:01.000Z' },
    createdAt: '2026-10-16T10:00:02.000Z',
  };
}
function rawCapture(status: 'requested' | 'capturing' | 'completed' | 'failed' | 'cancelled' = 'requested') {
  return {
    schemaVersion: 'local-data-capture.v1', localDatasetId: datasetId, captureId,
    requestFingerprint: createLocalDataRequestFingerprintV1(rawRequest()),
    requestedAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:03.000Z',
    status,
    ...(status === 'completed' ? { generationId } : {}),
    ...(status === 'failed' ? { failureCode: 'source-failed' } : {}),
  };
}

describe('LOCAL identity and public surface', () => {
  it('exports the same validators from the public barrel', () => {
    expect(publicContracts.LocalDataGenerationManifestV1Schema).toBe(LocalDataGenerationManifestV1Schema);
  });
  it('allocates independent UUIDv7 families using the existing crypto owner', () => {
    expect(LocalDatasetIdV1Schema.safeParse(createLocalDatasetIdV1()).success).toBe(true);
    expect(LocalDataCaptureIdV1Schema.safeParse(createLocalDataCaptureIdV1()).success).toBe(true);
    expect(LocalDataGenerationIdV1Schema.safeParse(createLocalDataGenerationIdV1()).success).toBe(true);
    expect(new Set(Array.from({ length: 100 }, () => createLocalDataCaptureIdV1())).size).toBe(100);
  });
  it.each([captureId, generationId, ` ${datasetId}`, `${datasetId}\n`, datasetId.toUpperCase(), datasetId.replace('-7222-', '-4222-')])('rejects the wrong dataset identity %s', (value) => {
    expect(LocalDatasetIdV1Schema.safeParse(value).success).toBe(false);
  });
  it('does not relax the existing LIVE/LOCAL contract', () => {
    expect(DataAccessSelectionSchema.safeParse({ mode: 'local', localDatasetId: datasetId, generationId }).success).toBe(true);
    expect(DataAccessSelectionSchema.safeParse({ mode: 'live', generationId }).success).toBe(false);
    expect(isWorkingDataTransitionAllowed({ status: 'absent' }, { status: 'building', captureId })).toBe(true);
  });
});

describe('ordered schema and acquisition fingerprints', () => {
  it('matches an independently generated schema golden vector', () => {
    expect(createLocalDataSchemaDigestV1(rawSchema())).toBe('fd5063ba9b8d12b8d7cb305c2a1c440f0cc1d2f02d417eb79c90c7b2f529e49b');
  });
  it('matches an independently generated request golden vector', () => {
    expect(createLocalDataRequestFingerprintV1(rawRequest())).toBe('9fddb26b3f8faa919e5f00ed393f75d19ffcf2094e50880a62f0c3489208b650');
  });
  it('ignores JSON property insertion order, not semantic column order', () => {
    const r = rawRequest();
    const reordered = { providerContextSha256: r.providerContextSha256, schema: r.schema, policy: r.policy, sourceRef: r.sourceRef, schemaVersion: r.schemaVersion };
    expect(createLocalDataRequestFingerprintV1(reordered)).toBe(createLocalDataRequestFingerprintV1(r));
    const s = rawSchema();
    s.columns.reverse().forEach((column, ordinal) => { column.ordinal = ordinal; });
    expect(createLocalDataSchemaDigestV1(s)).not.toBe(createLocalDataSchemaDigestV1(rawSchema()));
  });
  it('preserves duplicate names and significant whitespace by ordinal', () => {
    const s = rawSchema();
    s.columns[0]!.name = ' id ';
    s.columns[1]!.name = ' id ';
    expect(LocalDataSchemaV1Schema.parse(s).columns.map((column) => column.name)).toEqual([' id ', ' id ']);
  });
  it.each([[-1, 1], [0, 0], [1, 0], [0, 2], [0.5, 1]])('rejects bad ordinals %s', (a, b) => {
    const s = rawSchema();
    s.columns[0]!.ordinal = a;
    s.columns[1]!.ordinal = b;
    expect(LocalDataSchemaV1Schema.safeParse(s).success).toBe(false);
  });
  it('bounds schema metadata and rejects unknown type claims', () => {
    const s = rawSchema();
    s.columns[0]!.localType = 'unknown';
    expect(LocalDataSchemaV1Schema.safeParse(s).success).toBe(false);
    expect(LocalDataSchemaV1Schema.safeParse({ ...rawSchema(), columns: [] }).success).toBe(false);
    expect(LocalDataSchemaV1Schema.safeParse({ ...rawSchema(), columns: Array.from({ length: 4097 }, (_, ordinal) => ({ ...rawSchema().columns[0]!, ordinal })) }).success).toBe(false);
  });
  it('changes identity when source binding, context, sample or schema changes', () => {
    const baseline = createLocalDataRequestFingerprintV1(rawRequest());
    const differentSource = rawRequest();
    differentSource.sourceRef.connectionRef.connectionId = 'billing';
    const differentType = rawRequest();
    differentType.schema.columns[1]!.sourceType = 'numeric(20,3)';
    for (const request of [differentSource, differentType, rawRequest(true), { ...rawRequest(), providerContextSha256: 'b'.repeat(64) }]) {
      expect(createLocalDataRequestFingerprintV1(request)).not.toBe(baseline);
    }
  });
  it.each(['semanticPlanSha256', 'layout', 'captureId', 'generationId', 'capturedAt', 'previewPageSize', 'credentials', 'sql'])('rejects non-acquisition field %s instead of hashing or silently dropping it', (field) => {
    expect(LocalDataAcquisitionRequestV1Schema.safeParse({ ...rawRequest(), [field]: 'not-owned-here' }).success).toBe(false);
  });
  it('does not include capture IDs/times in the request fingerprint', () => {
    const a = rawManifest();
    const b = { ...a, generationId: `dvt_gen_${nextUuid}`, captureId: `dvt_cap_${nextUuid}`, createdAt: '2026-10-16T11:00:00.000Z' };
    expect(LocalDataGenerationManifestV1Schema.parse(b).requestFingerprint).toBe(LocalDataGenerationManifestV1Schema.parse(a).requestFingerprint);
  });
  it.each(['random', 'reservoir', 'stratified', 'temporal'])('does not advertise an unimplemented method %s', (method) => {
    expect(LocalDataAcquisitionRequestV1Schema.safeParse({ ...rawRequest(true), policy: { kind: 'sample', method, requestedRows: '10' } }).success).toBe(false);
  });
});

describe('generation manifest structural consistency', () => {
  it('accepts FULL at EOF including a genuinely empty source', () => {
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(), rowCount: '0', logicalByteCount: '0' }).success).toBe(true);
  });
  it('reuses the existing coverage vocabulary', () => {
    const m = LocalDataGenerationManifestV1Schema.parse(rawManifest());
    expect(WorkingDataCoverageSchema.parse(m.coverage)).toEqual(m.coverage);
  });
  it('retains a sample label when EOF occurs before the target', () => {
    expect(LocalDataGenerationManifestV1Schema.parse(rawManifest(true)).coverage.kind).toBe('sample');
  });
  it.each([0, -1, '00', '1e3', '18446744073709551616', '1\n'])('rejects inexact or malformed row count %s', (rowCount) => {
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(), rowCount }).success).toBe(false);
  });
  it('preserves counters beyond JS Number precision', () => {
    const m = LocalDataGenerationManifestV1Schema.parse({ ...rawManifest(), rowCount: '9007199254740993' });
    expect(m.rowCount).toBe('9007199254740993');
  });
  it('rejects a safety stop represented as completion', () => {
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(), completionReason: 'budget-exceeded' }).success).toBe(false);
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(true), completionReason: 'sample-target-reached' }).success).toBe(false);
  });
  it('accepts exact sample target without asserting source EOF', () => {
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(true), rowCount: '10', completionReason: 'sample-target-reached' }).success).toBe(true);
  });
  it('rejects FULL without EOF or sample relabelled FULL', () => {
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(), coverage: { kind: 'full' } }).success).toBe(false);
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(true), coverage: { kind: 'full', eofObserved: true } }).success).toBe(false);
  });
  it.each(['requestFingerprint', 'schemaSha256'])('rejects a stale %s', (field) => {
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(), [field]: 'b'.repeat(64) }).success).toBe(false);
  });
  it('fails safely on malformed inner schema without throwing from superRefine', () => {
    const m = rawManifest();
    m.request.schema.columns[0]!.ordinal = 7;
    expect(() => LocalDataGenerationManifestV1Schema.safeParse(m)).not.toThrow();
    expect(LocalDataGenerationManifestV1Schema.safeParse(m).success).toBe(false);
  });
  it.each(['rows', 'sql', 'localPath', 'credentialRef', 'fresh', 'tableName'])('rejects unowned generation field %s', (field) => {
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...rawManifest(), [field]: 'not-stored' }).success).toBe(false);
  });
  it('rejects nested secrets, invalid versions and inconsistent timestamps', () => {
    const m = rawManifest();
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...m, sourceObservation: { ...m.sourceObservation, token: 'secret' } }).success).toBe(false);
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...m, schemaVersion: 'local-data-generation.v2' }).success).toBe(false);
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...m, createdAt: '2026-02-30T10:00:00.000Z' }).success).toBe(false);
    expect(LocalDataGenerationManifestV1Schema.safeParse({ ...m, createdAt: '2026-10-16T09:00:00.000Z' }).success).toBe(false);
  });
  it('matches both selection IDs and never falls back to latest/LIVE', () => {
    const s = { mode: 'local', localDatasetId: datasetId, generationId };
    expect(matchesLocalDataGenerationSelectionV1(s, rawManifest())).toBe(true);
    expect(matchesLocalDataGenerationSelectionV1({ ...s, localDatasetId: `dvt_lds_${nextUuid}` }, rawManifest())).toBe(false);
    expect(matchesLocalDataGenerationSelectionV1({ ...s, generationId: `dvt_gen_${nextUuid}` }, rawManifest())).toBe(false);
    expect(matchesLocalDataGenerationSelectionV1({ mode: 'live' }, rawManifest())).toBe(false);
  });
});

describe('capture attempt vs aggregate working-data state', () => {
  it('requires generation only in completed records', () => {
    const { generationId: _id, ...incomplete } = rawCapture('completed');
    expect(LocalDataCaptureRecordV1Schema.safeParse(incomplete).success).toBe(false);
    expect(LocalDataCaptureRecordV1Schema.safeParse({ ...rawCapture('failed'), generationId }).success).toBe(false);
    expect(LocalDataCaptureRecordV1Schema.safeParse({ ...rawCapture('requested'), generationId }).success).toBe(false);
  });
  it('accepts declared failures without storing raw exception text', () => {
    expect(LocalDataCaptureRecordV1Schema.safeParse(rawCapture('failed')).success).toBe(true);
    expect(LocalDataCaptureRecordV1Schema.safeParse({ ...rawCapture('failed'), errorMessage: 'raw exception' }).success).toBe(false);
  });
  it('permits a request-time denial and an in-flight cancellation', () => {
    expect(isLocalDataCaptureTransitionAllowedV1(rawCapture('requested'), rawCapture('failed'))).toBe(true);
    expect(isLocalDataCaptureTransitionAllowedV1(rawCapture('capturing'), rawCapture('cancelled'))).toBe(true);
  });
  it.each(['failed', 'cancelled', 'completed'] as const)('never revives a %s attempt', (status) => {
    expect(isLocalDataCaptureTransitionAllowedV1(rawCapture(status), rawCapture('capturing'))).toBe(false);
  });
  it('rejects an identity change, backwards clock and malformed records', () => {
    expect(isLocalDataCaptureTransitionAllowedV1(rawCapture('capturing'), { ...rawCapture('completed'), captureId: `dvt_cap_${nextUuid}` })).toBe(false);
    expect(isLocalDataCaptureTransitionAllowedV1(rawCapture('capturing'), { ...rawCapture('completed'), updatedAt: '2026-10-16T10:00:01.000Z' })).toBe(false);
    expect(isLocalDataCaptureTransitionAllowedV1(null, rawCapture())).toBe(false);
  });
  it('matches completion with the precise manifest and bounded timeline', () => {
    const a = rawCapture('completed');
    const m = rawManifest();
    expect(matchesLocalDataCaptureCompletionV1(a, m)).toBe(true);
    expect(matchesLocalDataCaptureCompletionV1({ ...a, generationId: `dvt_gen_${nextUuid}` }, m)).toBe(false);
    expect(matchesLocalDataCaptureCompletionV1({ ...a, requestFingerprint: 'b'.repeat(64) }, m)).toBe(false);
    expect(matchesLocalDataCaptureCompletionV1({ ...a, updatedAt: '2026-10-16T10:00:01.000Z' }, m)).toBe(false);
  });
});
