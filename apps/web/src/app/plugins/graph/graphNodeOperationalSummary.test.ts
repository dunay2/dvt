import { describe, expect, it } from 'vitest';

import { buildGraphNodeOperationalSummary } from './graphNodeOperationalSummary';

describe('buildGraphNodeOperationalSummary', () => {
  it('projects recorded runtime metrics before static table metrics', () => {
    const summary = buildGraphNodeOperationalSummary({
      title: 'Orders Model',
      metadata: {
        durationMs: 75432,
        lastRunAt: '2026-06-12T20:45:00Z',
        rowCount: 1210,
        byteSize: 2048,
      },
      data: {},
      rowCount: 1210,
      byteSize: 2048,
    });

    expect(summary.metrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z', icon: 'clock' },
      { id: 'duration', label: 'Duration', value: '1m 15s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '1.2k', icon: 'rows' },
    ]);
    expect(summary.detail).toEqual({
      title: 'Orders Model health',
      ariaLabel: 'Open Orders Model health metrics',
      rows: summary.metrics,
    });
  });

  it('projects static row and size metrics when no runtime metrics are recorded', () => {
    const summary = buildGraphNodeOperationalSummary({
      title: 'Postgres public',
      metadata: { rowCount: 18240, byteSize: 4096000 },
      data: {},
      rowCount: 18240,
      byteSize: 4096000,
    });

    expect(summary.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '18.2k', icon: 'rows' },
      { id: 'size', label: 'Size', value: '3.9 MB', icon: 'database' },
    ]);
    expect(summary.detail?.rows).toBe(summary.metrics);
  });

  it('projects source health metrics from recorded warehouse freshness data', () => {
    const summary = buildGraphNodeOperationalSummary({
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
      rowCount: 124_000_000,
      byteSize: null,
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
      { id: 'size', label: 'Size', value: '18.2 GB', icon: 'database' },
    ]);
    expect(summary.detail).toEqual({
      title: 'Postgres public health',
      ariaLabel: 'Open Postgres public health metrics',
      rows: [
        { id: 'freshness', label: 'Freshness', value: '12 min', icon: 'clock' },
        {
          id: 'last-refresh',
          label: 'Last refresh',
          value: '2026-06-28T10:15:00Z',
          icon: 'refresh',
        },
        { id: 'cadence', label: 'Cadence', value: 'Every 15 min', icon: 'refresh' },
        { id: 'throughput', label: 'Throughput', value: '42 MB/min', icon: 'throughput' },
        { id: 'size', label: 'Size', value: '18.2 GB', icon: 'database' },
        { id: 'rows', label: 'Rows', value: '124M', icon: 'rows' },
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
      title: 'Raw Orders',
      metadata: {
        schemaDriftStatus: 'detected',
      },
      data: {},
      rowCount: null,
      byteSize: null,
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
    expect(summary.detail).toEqual({
      title: 'Raw Orders health',
      ariaLabel: 'Open Raw Orders health metrics',
      rows: [
        {
          id: 'schema-drift',
          label: 'Schema drift',
          value: 'Drift detected',
          tone: 'warning',
          icon: 'drift',
        },
      ],
    });
  });

  it('does not invent placeholder metrics when operational data is absent', () => {
    const summary = buildGraphNodeOperationalSummary({
      title: 'Draft Transform',
      metadata: {},
      data: {},
      rowCount: null,
      byteSize: null,
    });

    expect(summary.metrics).toEqual([]);
    expect(summary.detail).toBeNull();
  });

  it('accepts normalized runtime data when a strategy adapts canonical fields', () => {
    const summary = buildGraphNodeOperationalSummary({
      title: 'Customer Rollup',
      metadata: { rowCount: 4200 },
      data: {},
      runtimeData: { durationMs: 75000 },
      rowCount: 4200,
      byteSize: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'duration', label: 'Duration', value: '1m 15s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '4.2k', icon: 'rows' },
    ]);
  });

  it('projects model execution metrics from recorded run data', () => {
    const summary = buildGraphNodeOperationalSummary({
      title: 'Orders Model',
      metadata: {
        lastRunMinutesAgo: 8,
        durationSeconds: 32,
        rowCount: 2_100_000,
        costUsd: 0.18,
        testStatus: 'passed',
      },
      data: {},
      rowCount: 2_100_000,
      byteSize: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '8 min', icon: 'clock' },
      { id: 'duration', label: 'Duration', value: '32s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '2.1M', icon: 'rows' },
      { id: 'cost', label: 'Cost', value: '$0.18', icon: 'cost' },
      { id: 'tests', label: 'Tests', value: 'passed' },
    ]);
    expect(summary.detail?.rows).toBe(summary.metrics);
  });

  it('projects model execution cost from the canonical lastCost field', () => {
    const summary = buildGraphNodeOperationalSummary({
      title: 'Orders Model',
      metadata: {
        durationSeconds: 32,
      },
      data: {
        lastCost: 0.42,
      },
      rowCount: 2_100_000,
      byteSize: null,
    });

    expect(summary.metrics).toEqual([
      { id: 'duration', label: 'Duration', value: '32s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '2.1M', icon: 'rows' },
      { id: 'cost', label: 'Cost', value: '$0.42', icon: 'cost' },
    ]);
  });
});
