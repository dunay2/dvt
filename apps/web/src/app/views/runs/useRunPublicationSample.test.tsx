// @vitest-environment jsdom
/** Owned concern: prove publication-bound sampling and stale-response isolation. */
import { asSha256HexString, SourceDataSampleResponseSchema } from '@dvt/contracts';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { RunSnapshot } from '../../ports/runs';
import type { WarehouseConnection } from '../../ports/workspace';
import { ApiError } from '../../services/api/createApiClient';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import { createRunStatesHarness } from './test/RunStatesHarness';
import { createRunPublicationSnapshot } from './test/runPublicationFixture';
import { useRunPublicationSample } from './useRunPublicationSample';

const scope: WorkspaceScope = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  targetAdapter: 'temporal',
};
const connection: WarehouseConnection = {
  id: 'postgresql-local',
  name: 'Published data',
  type: 'postgres',
  database: 'proof db',
};
const sample = SourceDataSampleResponseSchema.parse({
  contractVersion: 1,
  connectionId: connection.id,
  objectId: 'relation/proof%20db/dvt/orders_result',
  columns: [{ name: 'name', type: 'text', nullable: true }],
  rows: [{ values: ['A'] }],
  limit: 20,
  truncated: false,
  provenance: {
    mode: 'live',
    queriedAt: '2026-10-06T10:00:00.000Z',
    limit: 20,
    navigation: 'bounded-first-page',
    sourceRefs: [
      {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: connection.id,
          provider: 'postgres',
        },
        sourceObjectId: 'relation/proof%20db/dvt/orders_result',
      },
    ],
  },
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

describe('Run publication sample lifecycle', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;
  let controller: ReturnType<typeof useRunPublicationSample>;
  let currentScope: WorkspaceScope;
  const connections = { listWarehouseConnections: vi.fn(async () => [connection]) };
  const samples = { previewSourceObjectRows: vi.fn(async () => sample) };

  function Host({ snapshot }: { snapshot: RunSnapshot }): null {
    controller = useRunPublicationSample({
      snapshot,
      scope: currentScope,
      connections,
      samples,
      getScope: () => currentScope,
    });
    return null;
  }
  const render = (snapshot = createRunPublicationSnapshot()): Promise<void> =>
    harness.render(<Host snapshot={snapshot} />);

  beforeEach(() => {
    currentScope = scope;
    connections.listWarehouseConnections.mockReset().mockResolvedValue([connection]);
    samples.previewSourceObjectRows.mockReset().mockResolvedValue(sample);
    harness = createRunStatesHarness();
  });
  afterEach(() => harness.cleanup());

  it('loads only on request and binds exact connection, escaped database and immutable token', async () => {
    connections.listWarehouseConnections.mockResolvedValue([
      { ...connection, id: 'another' },
      connection,
    ]);
    await render();
    expect(controller.state.kind).toBe('idle');
    expect(connections.listWarehouseConnections).not.toHaveBeenCalled();
    await act(() => controller.load());
    expect(samples.previewSourceObjectRows).toHaveBeenCalledExactlyOnceWith({
      connectionId: connection.id,
      objectId: sample.objectId,
      expectedPublicationToken: createRunPublicationSnapshot().publication!.publication.token,
      limit: 20,
    });
    expect(controller.state).toEqual({ kind: 'ready', sample });
  });

  it.each<Partial<RunSnapshot>>([
    { status: 'pending' },
    { status: 'running' },
    { status: 'failed' },
    { status: 'cancelled' },
    { publication: undefined },
    { tenantId: undefined },
    { tenantId: 'other' },
    { projectId: 'other' },
    { environment: 'other' },
  ])('does not read rows without completed evidence and matching scope: %j', async (overrides) => {
    await render(createRunPublicationSnapshot(overrides));
    await act(() => controller.load());
    expect(controller.state.kind).toBe('unavailable');
    expect(connections.listWarehouseConnections).not.toHaveBeenCalled();
    expect(samples.previewSourceObjectRows).not.toHaveBeenCalled();
  });

  it('rejects missing connection without falling back to another connection', async () => {
    connections.listWarehouseConnections.mockResolvedValue([{ ...connection, id: 'other' }]);
    await render();
    await act(() => controller.load());
    expect(controller.state).toEqual({ kind: 'error', reason: 'connection_not_found' });
    expect(samples.previewSourceObjectRows).not.toHaveBeenCalled();
  });

  it('clears previously verified rows during refresh and after publication replacement', async () => {
    await render();
    await act(() => controller.load());
    const pending = deferred<typeof sample>();
    samples.previewSourceObjectRows.mockReturnValueOnce(pending.promise);
    let request!: Promise<void>;
    await act(async () => {
      request = controller.load();
    });
    expect(controller.state).toEqual({ kind: 'loading' });
    await act(async () => {
      pending.resolve(sample);
      await request;
    });
    samples.previewSourceObjectRows.mockRejectedValueOnce(
      new WarehouseSourceDataSampleQueryError('publication_changed')
    );
    await act(() => controller.load());
    expect(controller.state).toEqual({ kind: 'error', reason: 'publication_changed' });
  });

  it.each([401, 403, 503])(
    'maps HTTP %i without exposing diagnostics or retaining rows',
    async (statusCode) => {
      samples.previewSourceObjectRows.mockRejectedValue(
        new ApiError({
          message: 'secret credentials',
          endpoint: '/private',
          statusCode,
          category: 'client',
        })
      );
      await render();
      await act(() => controller.load());
      expect(controller.state).toEqual({
        kind: 'error',
        reason:
          statusCode === 401
            ? 'auth-required'
            : statusCode === 403
              ? 'access-denied'
              : 'unavailable',
      });
    }
  );

  it('discards an in-flight response after navigating A to B and reopening A', async () => {
    const pending = deferred<typeof sample>();
    samples.previewSourceObjectRows.mockReturnValueOnce(pending.promise);
    await render();
    let request!: Promise<void>;
    await act(async () => {
      request = controller.load();
    });
    await render(createRunPublicationSnapshot({ runId: 'B' }));
    await render();
    await act(async () => {
      pending.resolve(sample);
      await request;
    });
    expect(controller.state).toEqual({ kind: 'idle' });
  });

  it('does not issue a row query if scope changes during connection resolution', async () => {
    const pending = deferred<(typeof connection)[]>();
    connections.listWarehouseConnections.mockReturnValueOnce(pending.promise);
    await render();
    let request!: Promise<void>;
    await act(async () => {
      request = controller.load();
    });
    currentScope = { ...scope, projectId: 'other' };
    await act(async () => {
      pending.resolve([connection]);
      await request;
    });
    await render();
    expect(samples.previewSourceObjectRows).not.toHaveBeenCalled();
    expect(controller.state.kind).toBe('unavailable');
  });

  it('isolates publication changes within the same Run and ignores an older response', async () => {
    const pending = deferred<typeof sample>();
    samples.previewSourceObjectRows.mockReturnValueOnce(pending.promise);
    await render();
    let request!: Promise<void>;
    await act(async () => {
      request = controller.load();
    });
    const next = createRunPublicationSnapshot();
    next.publication = {
      ...next.publication!,
      publication: { ...next.publication!.publication, token: asSha256HexString('b'.repeat(64)) },
    };
    await render(next);
    samples.previewSourceObjectRows.mockResolvedValueOnce({ ...sample, rows: [{ values: ['B'] }] });
    await act(() => controller.load());
    await act(async () => {
      pending.resolve(sample);
      await request;
    });
    expect(controller.state).toEqual({
      kind: 'ready',
      sample: { ...sample, rows: [{ values: ['B'] }] },
    });
  });

  it('rejects a response for another target rather than attributing it to this Run', async () => {
    samples.previewSourceObjectRows.mockResolvedValueOnce({
      ...sample,
      objectId: 'relation/other/db/table',
    });
    await render();
    await act(() => controller.load());
    expect(controller.state).toEqual({ kind: 'error', reason: 'unavailable' });
  });
});
