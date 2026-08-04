import { describe, expect, it } from 'vitest';

import { MaterializationEvidenceSchema } from '../src/index.js';

const BASE_EVIDENCE = {
  executor: 'postgres',
  environmentId: 'dev',
  sinkTable: 'staging.orders_import',
  rowsWritten: 2,
  startedAt: '2026-08-04T10:00:00.000Z',
  completedAt: '2026-08-04T10:00:01.000Z',
  durationMs: 1_000,
} as const;

describe('MaterializationEvidenceSchema', () => {
  it('accepts additive content-addressed source and publication evidence', () => {
    expect(
      MaterializationEvidenceSchema.parse({
        ...BASE_EVIDENCE,
        sourceArtifact: {
          sha256: 'a'.repeat(64),
          sizeBytes: 128,
          mediaType: 'text/csv',
        },
        publicationOutcome: 'replaced',
      })
    ).toMatchObject({
      sourceArtifact: {
        sha256: 'a'.repeat(64),
        sizeBytes: 128,
        mediaType: 'text/csv',
      },
      publicationOutcome: 'replaced',
    });
  });

  it('keeps existing materialization evidence backward compatible', () => {
    expect(MaterializationEvidenceSchema.safeParse(BASE_EVIDENCE).success).toBe(true);
  });

  it.each([
    [
      'invalid source digest',
      { sourceArtifact: { sha256: 'invalid', sizeBytes: 1, mediaType: 'text/csv' } },
    ],
    [
      'invalid source size',
      { sourceArtifact: { sha256: 'a'.repeat(64), sizeBytes: -1, mediaType: 'text/csv' } },
    ],
    ['unknown publication outcome', { publicationOutcome: 'appended' }],
  ])('rejects %s', (_label, patch) => {
    expect(MaterializationEvidenceSchema.safeParse({ ...BASE_EVIDENCE, ...patch }).success).toBe(
      false
    );
  });
});
