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
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z' },
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'rows', label: 'Rows', value: '1.2k' },
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
      { id: 'rows', label: 'Rows', value: '18.2k' },
      { id: 'size', label: 'Size', value: '3.9 MB' },
    ]);
    expect(summary.detail?.rows).toBe(summary.metrics);
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
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'rows', label: 'Rows', value: '4.2k' },
    ]);
  });
});
