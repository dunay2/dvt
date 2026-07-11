import { describe, expect, it } from 'vitest';

import { buildGraphNodeOperationalSummary } from './graphNodeOperationalSummary';
import { buildGraphNodeVolumeMetricProjection } from './graphNodeSourceMetricProjection';

function projectRuntimeVolume(
  rowCount: number | null,
  byteSize: number | null,
  estimatedByteSize: number | null
): ReturnType<typeof buildGraphNodeVolumeMetricProjection> {
  return buildGraphNodeVolumeMetricProjection({
    isSourceObject: false,
    metadata: {
      ...(rowCount === null ? {} : { rowCount }),
      ...(byteSize === null ? {} : { byteSize }),
      ...(estimatedByteSize === null ? {} : { estimatedByteSize }),
    },
    data: {},
  });
}

describe('buildGraphNodeOperationalSummary', () => {
  it('uses the explicit execution strategy even when model metadata has freshness fields', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'execution',
      title: 'Orders Model',
      metadata: {
        freshnessMinutes: 12,
        lastRunMinutesAgo: 8,
        durationSeconds: 32,
        rowCount: 2100,
      },
      data: {},
      volumeMetricProjection: projectRuntimeVolume(2100, null, null),
      columnCount: null,
    });

    expect(summary.metrics.map((metric) => metric.id)).toEqual(['last-run', 'duration', 'rows']);
  });

  it('does not derive average row payload from physical allocation bytes', () => {
    const volumeMetricProjection = buildGraphNodeVolumeMetricProjection({
      isSourceObject: true,
      metadata: {
        sourceMetricEvidence: {
          observedAt: '2026-07-10T21:00:00.000Z',
          observationScope: { kind: 'snapshot' },
          rowCount: {
            value: 100,
            provenance: 'estimated',
            method: 'provider-statistics',
            confidence: 'medium',
          },
          byteSize: {
            value: 4096,
            provenance: 'measured',
            method: 'provider-storage-metadata',
            confidence: 'exact',
            basis: 'physical-allocation',
          },
        },
      },
      data: {},
    });
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'source',
      title: 'Orders source',
      metadata: {},
      data: {},
      volumeMetricProjection,
      columnCount: 3,
    });

    expect(summary.detail?.rows.some((row) => row.id === 'avg-row-size')).toBe(false);
    expect(summary.detail?.rows.some((row) => row.id === 'observed-at')).toBe(true);
  });

  it('projects recorded runtime metrics before static table metrics', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'execution',
      title: 'Orders Model',
      metadata: {
        durationMs: 75432,
        lastRunAt: '2026-06-12T20:45:00Z',
        rowCount: 1210,
        byteSize: 2048,
      },
      data: {},
      volumeMetricProjection: projectRuntimeVolume(1210, 2048, null),
      columnCount: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z', icon: 'clock' },
      { id: 'duration', label: 'Duration', value: '1m 15s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '1.2k', icon: 'rows' },
    ]);
    expect(summary.detail).toBeNull();
  });

  it('keeps static row and size metrics interactive when byte-level detail is recorded', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'source',
      title: 'Postgres public',
      metadata: { rowCount: 18240, byteSize: 4096000 },
      data: {},
      volumeMetricProjection: projectRuntimeVolume(18240, 4096000, null),
      columnCount: 2,
    });

    expect(summary.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '18.2k', icon: 'rows', detail: '18,240 rows.' },
      {
        id: 'size',
        label: 'Size',
        value: '3.9 MB',
        icon: 'database',
        tone: 'success',
        detail: '4,096,000 B (3.9 MB).',
      },
    ]);
    expect(summary.detail).toEqual({
      title: 'Postgres public health',
      ariaLabel: 'Open Postgres public health metrics',
      rows: [
        { id: 'columns', label: 'Columns', value: '2', icon: 'columns' },
        {
          id: 'dataset-size',
          label: 'Dataset size',
          value: '3.9 MB',
          icon: 'database',
          tone: 'success',
          detail: '4,096,000 B (3.9 MB).',
        },
        {
          id: 'avg-row-size',
          label: 'Avg row size',
          value: '224.6 B',
          icon: 'throughput',
          tone: 'success',
        },
      ],
    });
  });

  it('marks calculated source size as warning evidence while preserving row weight context', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'source',
      title: 'Parquet landing object',
      metadata: { rowCount: 18240, estimatedByteSize: 1240320 },
      data: {},
      volumeMetricProjection: projectRuntimeVolume(18240, null, 1240320),
      columnCount: 2,
    });

    expect(summary.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '18.2k', icon: 'rows', detail: '18,240 rows.' },
      {
        id: 'size',
        label: 'Est. size',
        value: '1.2 MB',
        icon: 'database',
        tone: 'warning',
        detail: '1,240,320 B (1.2 MB).',
      },
    ]);
    expect(summary.detail).toEqual({
      title: 'Parquet landing object health',
      ariaLabel: 'Open Parquet landing object health metrics',
      rows: [
        { id: 'columns', label: 'Columns', value: '2', icon: 'columns' },
        {
          id: 'dataset-size',
          label: 'Estimated payload size',
          value: '1.2 MB',
          icon: 'database',
          tone: 'warning',
          detail: '1,240,320 B (1.2 MB).',
        },
        {
          id: 'avg-row-size',
          label: 'Est. avg row size',
          value: '68 B',
          icon: 'throughput',
          tone: 'warning',
        },
      ],
    });
  });

  it('does not invent source metrics when governed source evidence is absent', () => {
    const volumeMetricProjection = buildGraphNodeVolumeMetricProjection({
      isSourceObject: true,
      metadata: {},
      data: {},
    });
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'source',
      title: 'Postgres public',
      metadata: {},
      data: {},
      volumeMetricProjection,
      columnCount: 2,
    });

    expect(summary.metrics).toEqual([]);
    expect(summary.detail).toBeNull();
  });

  it('projects source health metrics from recorded warehouse freshness data', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'source',
      title: 'Postgres public',
      metadata: {
        freshnessMinutes: 12,
        lastRefreshAt: '2026-06-28T10:15:00Z',
        cadenceMinutes: 15,
        throughputBytesPerMinute: 42 * 1024 * 1024,
        datasetSizeBytes: 18.2 * 1024 * 1024 * 1024,
        rowCount: 124_000_000,
        schemaDriftStatus: 'ok',
      },
      data: {},
      volumeMetricProjection: projectRuntimeVolume(124_000_000, 18.2 * 1024 * 1024 * 1024, null),
      columnCount: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'freshness', label: 'Freshness', value: '12 min', icon: 'clock' },
      {
        id: 'last-refresh',
        label: 'Last refresh',
        value: '2026-06-28T10:15:00Z',
        icon: 'refresh',
      },
      { id: 'cadence', label: 'Cadence', value: 'Every 15 min', icon: 'refresh' },
      { id: 'throughput', label: 'Throughput', value: '42 MB/min', icon: 'throughput' },
      {
        id: 'rows',
        label: 'Rows',
        value: '124M',
        icon: 'rows',
        detail: '124,000,000 rows.',
      },
      {
        id: 'size',
        label: 'Size',
        value: '18.2 GB',
        icon: 'database',
        tone: 'success',
        detail: '19,542,101,197 B (18.2 GB).',
      },
    ]);
    expect(summary.detail).toEqual({
      title: 'Postgres public health',
      ariaLabel: 'Open Postgres public health metrics',
      rows: [
        {
          id: 'dataset-size',
          label: 'Dataset size',
          value: '18.2 GB',
          icon: 'database',
          tone: 'success',
          detail: '19,542,101,197 B (18.2 GB).',
        },
        {
          id: 'avg-row-size',
          label: 'Avg row size',
          value: '157.6 B',
          icon: 'throughput',
          tone: 'success',
        },
        {
          id: 'schema-drift',
          label: 'Schema drift',
          value: 'No drift detected',
          tone: 'success',
          icon: 'drift',
        },
      ],
    });
  });

  it('projects detected schema drift without inventing missing source metrics', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'source',
      title: 'Raw Orders',
      metadata: {
        schemaDriftStatus: 'detected',
      },
      data: {},
      volumeMetricProjection: projectRuntimeVolume(null, null, null),
      columnCount: null,
    });

    expect(summary.metrics).toEqual([
      {
        id: 'schema-drift',
        label: 'Schema drift',
        value: 'Drift detected',
        tone: 'warning',
        icon: 'drift',
      },
    ]);
    expect(summary.detail).toBeNull();
  });

  it('does not invent placeholder metrics when operational data is absent', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'execution',
      title: 'Draft Transform',
      metadata: {},
      data: {},
      volumeMetricProjection: projectRuntimeVolume(null, null, null),
      columnCount: null,
    });

    expect(summary.metrics).toEqual([]);
    expect(summary.detail).toBeNull();
  });

  it('accepts normalized runtime data when a strategy adapts canonical fields', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'execution',
      title: 'Customer Rollup',
      metadata: { rowCount: 4200 },
      data: {},
      runtimeData: { durationMs: 75000 },
      volumeMetricProjection: projectRuntimeVolume(4200, null, null),
      columnCount: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'duration', label: 'Duration', value: '1m 15s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '4.2k', icon: 'rows' },
    ]);
  });

  it('projects model execution metrics from recorded run data', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'execution',
      title: 'Orders Model',
      metadata: {
        lastRunMinutesAgo: 8,
        durationSeconds: 32,
        rowCount: 2_100_000,
        costUsd: 0.18,
        testStatus: 'passed',
      },
      data: {},
      volumeMetricProjection: projectRuntimeVolume(2_100_000, null, null),
      columnCount: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '8 min', icon: 'clock' },
      { id: 'duration', label: 'Duration', value: '32s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '2.1M', icon: 'rows' },
      { id: 'cost', label: 'Cost', value: '$0.18', icon: 'cost' },
      { id: 'tests', label: 'Tests', value: 'passed' },
    ]);
    expect(summary.detail).toBeNull();
  });

  it('projects model execution cost from the canonical lastCost field', () => {
    const summary = buildGraphNodeOperationalSummary({
      projectionKind: 'execution',
      title: 'Orders Model',
      metadata: {
        durationSeconds: 32,
      },
      data: {
        lastCost: 0.42,
      },
      volumeMetricProjection: projectRuntimeVolume(2_100_000, null, null),
      columnCount: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'duration', label: 'Duration', value: '32s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '2.1M', icon: 'rows' },
      { id: 'cost', label: 'Cost', value: '$0.42', icon: 'cost' },
    ]);
  });
});
