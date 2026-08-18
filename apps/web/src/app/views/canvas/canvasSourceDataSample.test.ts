import { describe, expect, it } from 'vitest';

import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import {
  resolveCanvasSinkDataSampleTarget,
  resolveCanvasSourceDataSampleError,
  resolveCanvasSourceDataSampleTarget,
} from './canvasSourceDataSample';

describe('canvas source data sample projection', () => {
  it('admits only governed relational imported sources', () => {
    expect(
      resolveCanvasSourceDataSampleTarget({
        name: 'orders',
        status: 'idle',
        metadata: {
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'postgresql-local',
              provider: 'postgres',
            },
            sourceObjectId: 'relation/dvt/public/orders',
          },
        },
      })
    ).toEqual({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
      nodeName: 'orders',
    });

    expect(
      resolveCanvasSourceDataSampleTarget({
        name: 'model_orders',
        status: 'idle',
        metadata: {},
      })
    ).toBeNull();
  });

  it('preserves stable query failure reasons and hides unknown failures', () => {
    expect(
      resolveCanvasSourceDataSampleError(
        new WarehouseSourceDataSampleQueryError('source_object_not_found'),
        'orders'
      )
    ).toEqual({
      status: 'error',
      nodeName: 'orders',
      reason: 'source_object_not_found',
    });
    expect(resolveCanvasSourceDataSampleError(new Error('secret'), 'orders')).toEqual({
      status: 'error',
      nodeName: 'orders',
      reason: 'unknown',
    });
  });

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

    expect(resolveCanvasSinkDataSampleTarget(sink, snapshot)).toEqual({
      runId: 'run-1',
      nodeName: 'Sink 1',
      rowsWritten: 118,
      completedAt: '2026-08-18T10:00:01.500Z',
      durationMs: 1_500,
      status: 'completed',
    });
    expect(
      resolveCanvasSinkDataSampleTarget(
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
      resolveCanvasSinkDataSampleTarget(
        {
          ...sink,
          metadata: { config: { schema: 'public', table: 'another_sink' } },
        },
        snapshot
      )
    ).toBeNull();
    expect(resolveCanvasSinkDataSampleTarget(sink, { ...snapshot, status: 'running' })).toBeNull();
  });
});
