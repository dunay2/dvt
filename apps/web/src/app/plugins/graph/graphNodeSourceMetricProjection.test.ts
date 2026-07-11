import { describe, expect, it } from 'vitest';

import { buildGraphNodeVolumeMetricProjection } from './graphNodeSourceMetricProjection';

describe('buildGraphNodeVolumeMetricProjection', () => {
  it('projects mixed provider evidence with complete operator detail', () => {
    const projection = buildGraphNodeVolumeMetricProjection({
      isSourceObject: true,
      metadata: {
        sourceMetricEvidence: {
          observedAt: '2026-07-10T21:00:00.000Z',
          observationScope: { kind: 'snapshot' },
          rowCount: {
            value: 125000,
            provenance: 'estimated',
            method: 'provider-statistics',
            confidence: 'medium',
          },
          byteSize: {
            value: 18200000,
            provenance: 'measured',
            method: 'provider-storage-metadata',
            confidence: 'exact',
            basis: 'physical-allocation',
          },
        },
      },
      data: {},
    });

    expect(projection.rowCount).toBe(125000);
    expect(projection.sizeEvidence).toEqual({
      bytes: 18200000,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
      observedAt: '2026-07-10T21:00:00.000Z',
      observationScope: { kind: 'snapshot' },
    });
    expect(projection.metrics).toEqual([
      {
        id: 'rows',
        label: 'Rows',
        value: '125k',
        tone: 'warning',
        detail:
          '125,000 rows. Estimated using provider statistics. Confidence: medium. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
      {
        id: 'bytes',
        label: 'Size',
        value: '17.4 MB',
        tone: 'success',
        detail:
          '18,200,000 B (17.4 MB). Measured using provider storage metadata. Physical allocation. Confidence: exact. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
    ]);
  });

  it('projects calculated source evidence in warning tone', () => {
    const projection = buildGraphNodeVolumeMetricProjection({
      isSourceObject: true,
      metadata: {
        sourceMetricEvidence: {
          observedAt: '2026-07-10T21:00:00.000Z',
          observationScope: { kind: 'snapshot' },
          rowCount: {
            value: 1200,
            provenance: 'estimated',
            method: 'query-plan',
            confidence: 'low',
          },
          byteSize: {
            value: 111600,
            provenance: 'estimated',
            method: 'schema-width',
            confidence: 'low',
            basis: 'logical-payload',
          },
        },
      },
      data: {},
    });

    expect(
      projection.metrics.map(({ id, label, value, tone }) => ({ id, label, value, tone }))
    ).toEqual([
      { id: 'rows', label: 'Rows', value: '1.2k', tone: 'warning' },
      { id: 'estimated-bytes', label: 'Est. size', value: '109 KB', tone: 'warning' },
    ]);
    expect(projection.metrics[1]?.detail).toBe(
      '111,600 B (109 KB). Estimated using schema width. Logical payload. Confidence: low. Snapshot observed: 2026-07-10T21:00:00.000Z.'
    );
  });

  it('fails closed when source evidence is incomplete instead of showing row-only weight', () => {
    const projection = buildGraphNodeVolumeMetricProjection({
      isSourceObject: true,
      metadata: {
        sourceMetricEvidence: {
          observedAt: '2026-07-10T21:00:00.000Z',
          observationScope: { kind: 'snapshot' },
          rowCount: {
            value: 1200,
            provenance: 'estimated',
            method: 'provider-statistics',
            confidence: 'medium',
          },
        },
      },
      data: {},
    });

    expect(projection).toEqual({ rowCount: null, sizeEvidence: null, metrics: [] });
  });

  it('keeps non-source runtime volume separate from source evidence semantics', () => {
    const projection = buildGraphNodeVolumeMetricProjection({
      isSourceObject: false,
      metadata: { rowCount: 2100000, byteSize: 4096000 },
      data: {},
    });

    expect(projection.metrics).toEqual([
      {
        id: 'rows',
        label: 'Rows',
        value: '2.1M',
        detail: '2,100,000 rows.',
      },
      {
        id: 'bytes',
        label: 'Size',
        value: '3.9 MB',
        tone: 'success',
        detail: '4,096,000 B (3.9 MB).',
      },
    ]);
  });
});
