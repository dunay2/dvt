import { expect, it } from 'vitest';
import { resolveCanvasSinkRunEvidence } from './canvasSinkRunEvidence';

it('binds a completed materialization only to its exact sink relation', () => {
  const sink = {
    name: 'Sink 1',
    status: 'idle' as const,
    role: 'output' as const,
    pluginKind: 'dvt:sink' as const,
    metadata: {
      config: {
        schema: 'public',
        table: 'sink_1',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  };
  const snapshot = {
    runId: 'run-1',
    status: 'completed' as const,
    materialization: {
      executor: 'postgres' as const,
      environmentId: 'dev',
      sinkTable: 'public.sink_1',
      rowsWritten: 118,
      startedAt: '2026-08-18T10:00:00.000Z',
      completedAt: '2026-08-18T10:00:01.500Z',
      durationMs: 1_500,
    },
  };

  expect(resolveCanvasSinkRunEvidence(sink, snapshot)).toEqual({
    runId: 'run-1',
    nodeName: 'Sink 1',
    rowsWritten: 118,
    completedAt: '2026-08-18T10:00:01.500Z',
    durationMs: 1_500,
    status: 'completed',
  });
  expect(
    resolveCanvasSinkRunEvidence(
      {
        ...sink,
        metadata: { typeLabel: 'Sink' },
      },
      snapshot
    )
  ).toEqual({
    runId: 'run-1',
    nodeName: 'Sink 1',
    rowsWritten: 118,
    completedAt: '2026-08-18T10:00:01.500Z',
    durationMs: 1_500,
    status: 'completed',
  });
  expect(
    resolveCanvasSinkRunEvidence(
      {
        ...sink,
        metadata: { config: { schema: 'public', table: 'another_sink' } },
      },
      snapshot
    )
  ).toBeNull();
  expect(resolveCanvasSinkRunEvidence(sink, { ...snapshot, status: 'running' })).toBeNull();
});
