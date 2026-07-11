import { describe, expect, it } from 'vitest';

import type { SourceObjectMetricEvidence } from '@dvt/contracts';
import { describeSourceObjectMetricEvidence } from './sourceObjectMetricEvidencePresentation';

const snapshotEvidence: SourceObjectMetricEvidence = {
  observedAt: '2026-07-11T12:00:00.000Z',
  observationScope: { kind: 'snapshot' },
  rowCount: {
    value: 1200,
    provenance: 'estimated',
    method: 'provider-statistics',
    confidence: 'medium',
  },
  byteSize: {
    value: 111600,
    provenance: 'estimated',
    method: 'schema-width',
    confidence: 'low',
    basis: 'provider-row-storage',
  },
};

describe('describeSourceObjectMetricEvidence', () => {
  it('explains provenance, method, confidence, storage basis, and snapshot time', () => {
    expect(
      describeSourceObjectMetricEvidence({
        metric: snapshotEvidence.byteSize,
        subject: '111,600 B (109 KB)',
        evidence: snapshotEvidence,
        basis: snapshotEvidence.byteSize.basis,
      })
    ).toBe(
      '111,600 B (109 KB). Estimated using schema width. Provider row storage. Confidence: low. Snapshot observed: 2026-07-11T12:00:00.000Z.'
    );
  });

  it('reports bounded observation windows for stream metrics', () => {
    const windowEvidence: SourceObjectMetricEvidence = {
      ...snapshotEvidence,
      observationScope: {
        kind: 'window',
        startedAt: '2026-07-11T11:00:00.000Z',
        endedAt: '2026-07-11T12:00:00.000Z',
      },
    };

    expect(
      describeSourceObjectMetricEvidence({
        metric: windowEvidence.rowCount,
        subject: '1,200 records',
        evidence: windowEvidence,
      })
    ).toContain('Observed window: 2026-07-11T11:00:00.000Z to 2026-07-11T12:00:00.000Z.');
  });
});
