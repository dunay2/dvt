/** @ownedConcern Characterize capture admission, terminal evidence and promotion ordering before composition. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildRelationalSourceObjectId,
  createLocalDataCaptureIdV1,
  createLocalDataGenerationIdV1,
  createLocalDatasetIdV1,
  LocalDataGenerationManifestV1Schema,
  type LocalDataGenerationManifestV1,
  type LocalDataSchemaV1,
} from '@dvt/contracts';
import { describe, it } from 'vitest';

import { AUTHORIZATION_ACTION_NAME as names } from '../../../src/application/ports/accessDecision.js';
import type { AuthAuditEvent } from '../../../src/application/ports/auth.js';
import type {
  ILocalDataCaptureWriter,
  IRemoteDatasetCursor,
  IRemoteDatasetReader,
  RemoteDatasetReadInput,
} from '../../../src/application/ports/localDataAcquisition.js';
import type { ILocalDataOperationAccess } from '../../../src/application/ports/localDataPlane.js';
import type { PrincipalGrantSnapshot } from '../../../src/application/ports/principalGrantRepository.js';
import type { WarehouseConnectionCatalogEntry } from '../../../src/application/ports/warehouseSourceImport.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { EmbeddedAccessDecisionService } from '../../../src/infrastructure/auth/embeddedAccessDecisionService.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'test' };
const schema: LocalDataSchemaV1 = {
  schemaVersion: 'local-data-schema.v1',
  columns: [{ ordinal: 0, name: 'id', sourceType: 'int8', localType: 'BIGINT', nullable: false }],
};
const sourceRef = {
  schemaVersion: 'connected-source-ref.v1' as const,
  connectionRef: { schemaVersion: 'connection-ref.v1' as const, connectionId: 'pg', provider: 'postgres' },
  sourceObjectId: buildRelationalSourceObjectId({ kind: 'relation', catalog: 'data', schema: 'public', name: 'orders', relationType: 'table' }),
};

async function fixture(values = [1n, 2n, 3n, 4n, 5n]) {
  // Intentionally loaded per case: the first TDD commit has tests but no coordinator implementation.
  const { CaptureLocalDatasetUseCase } = await import('../../../src/application/services/captureLocalDatasetUseCase.js');
  let now = new Date('2026-10-17T00:00:00.000Z');
  const principal = {
    principalId: 'u', principalType: 'user' as const, subjectId: 'sub', issuer: 'issuer', audience: 'dvt',
    expiresAt: new Date(now.getTime() + 60_000), rawScopes: [], assertedTenantIds: ['tenant'], assertedProjectIds: ['project'],
  };
  const state = {
    connection: { id: 'pg', name: 'Production', type: 'postgres', database: 'data', credentialRef: 'postgres:source', sourceObjects: [] } as WarehouseConnectionCatalogEntry,
    grants: {
      principal, suspended: false, tenantAccess: [{ tenantId: 'tenant', allowedActions: [], projectAccess: [{
        projectId: 'project', allowedActions: [], environmentAccess: [{ environmentId: 'test',
          allowedActions: [names.workspaceLocalDataCapture, names.workspaceSourceImportView] }],
      }] }],
    } as PrincipalGrantSnapshot | null,
    events: [] as string[], audit: [] as AuthAuditEvent[], pulls: [] as number[], closed: false,
    hook: undefined as undefined | ((phase: string) => void | Promise<void>),
    badBatch: undefined as undefined | Record<string, unknown>,
    manifests: [] as LocalDataGenerationManifestV1[],
    begin: undefined as Parameters<ILocalDataCaptureWriter['begin']>[0] | undefined,
    remoteInput: undefined as RemoteDatasetReadInput | undefined,
    operationAccess: undefined as ILocalDataOperationAccess | undefined,
  };
  const step = async (phase: string) => { state.events.push(phase); await state.hook?.(phase); };
  const authorizer = new AuthorizeCommandScopeService(new EmbeddedAccessDecisionService({
    migrate: async () => undefined, load: async () => state.grants,
  }), { record: async event => { state.audit.push(event); } }, () => now);
  const generationId = createLocalDataGenerationIdV1();
  const deps = {
    catalog: { getConnection: async (actual: typeof scope, id: string) => {
      assert.deepEqual(actual, scope); assert.equal(id, 'pg'); await step('catalog'); return state.connection;
    } },
    authorizer,
    reader: { async withCursor<T>(input: RemoteDatasetReadInput, consume: (cursor: IRemoteDatasetCursor) => Promise<T>): Promise<T> {
      state.remoteInput = input;
      await step('open');
      let offset = 0;
      const result = await consume({ schema, observedAt: '2026-10-17T00:00:00.000Z', read: async requested => {
        await step('read'); state.pulls.push(requested);
        const rows = values.slice(offset, offset + requested).map(value => [value]); offset += rows.length;
        return { rows, logicalBytes: rows.length * 8, endOfSource: rows.length < requested, ...state.badBatch };
      } });
      await step('close'); state.closed = true; return result;
    } },
    createWriter: (actual: typeof scope, access: ILocalDataOperationAccess): ILocalDataCaptureWriter => {
      assert.deepEqual(actual, scope); state.operationAccess = access;
      return {
        initialize: async () => { await step('initialize'); },
        begin: async input => { state.begin = input; await step('begin'); return { captureId: input.captureId, generationId }; },
        append: async () => { await step('append'); },
        promote: async input => {
          assert.equal(state.closed, true, 'source closure must precede publication');
          await step('promote'); await access.beforePromotion();
          const manifest = LocalDataGenerationManifestV1Schema.parse(input);
          state.manifests.push(manifest);
          await step('committed');
          return { disposition: 'published', generation: manifest };
        },
      };
    },
    clock: () => now,
    limits: { maxRows: 100, maxLogicalBytes: 1000 }, batchRows: 2, timeoutMs: 10_000,
  };
  const command = { localDatasetId: createLocalDatasetIdV1(), captureId: createLocalDataCaptureIdV1(),
    sourceRef: structuredClone(sourceRef), policy: { kind: 'full' as const }, expectedHeadGenerationId: null };
  const context = { scope: { ...scope }, principal, requestId: 'request' };
  const useCase = new CaptureLocalDatasetUseCase(deps);
  return { state, deps, command, context, generationId, useCase, CaptureLocalDatasetUseCase,
    setNow: (value: Date) => { now = value; },
    execute: (input: unknown = command, signal?: AbortSignal) => useCase.execute(input, context, signal) };
}

describe('CaptureLocalDataset application coordination', () => {
  it('builds FULL evidence from actual sequential batches and closes before promoting', async () => {
    const f = await fixture(); const result = await f.execute();
    assert.equal(result.generation.rowCount, '5'); assert.equal(result.generation.logicalByteCount, '40');
    assert.deepEqual(result.generation.coverage, { kind: 'full', eofObserved: true });
    assert.equal(result.generation.completionReason, 'source-exhausted');
    assert.equal(result.generation.generationId, f.generationId);
    assert.deepEqual(f.state.pulls, [2, 2, 2]);
    assert.deepEqual(f.state.events.filter(x => ['read', 'append', 'close', 'promote'].includes(x)),
      ['read', 'append', 'read', 'append', 'read', 'append', 'close', 'promote']);
    assert.equal(f.state.remoteInput?.access, f.state.operationAccess);
    assert.equal(f.state.operationAccess?.signal.aborted, true, 'lease ends with the operation');
    assert.ok(f.state.audit.every(event => event.tenantId === 'tenant'));
  });
  it('publishes an empty FULL without appending an empty batch', async () => {
    const f = await fixture([]); const result = await f.execute();
    assert.equal(result.generation.rowCount, '0'); assert.equal(result.generation.logicalByteCount, '0');
    assert.equal(f.state.events.includes('append'), false);
  });
  it.each([2, 4])('stops FIRST %s without a speculative pull or FULL upgrade', async target => {
    const f = await fixture([1n, 2n, 3n, 4n]);
    const result = await f.execute({ ...f.command, policy: { kind: 'sample', method: 'first', requestedRows: String(target) } });
    assert.equal(result.generation.rowCount, String(target));
    assert.equal(result.generation.completionReason, 'sample-target-reached');
    assert.deepEqual(result.generation.coverage, { kind: 'sample' });
    assert.equal(f.state.pulls.length, target / 2);
  });
  it('keeps a short sample a sample even when source exhaustion is observed', async () => {
    const f = await fixture([1n]);
    const result = await f.execute({ ...f.command, policy: { kind: 'sample', method: 'first', requestedRows: '7' } });
    assert.equal(result.generation.rowCount, '1'); assert.equal(result.generation.completionReason, 'source-exhausted');
    assert.deepEqual(result.generation.coverage, { kind: 'sample' });
  });
  it.each(['initialize', 'begin', 'read', 'append', 'close'])('does not promote when %s fails', async phase => {
    const f = await fixture(); const error = new Error('provider/writer failure');
    f.state.hook = current => { if (current === phase) throw error; };
    await assert.rejects(f.execute()); assert.equal(f.state.events.includes('promote'), false);
  });
  it('waits for asynchronous source closure instead of promoting inside the callback', async () => {
    const f = await fixture(); let release!: () => void; let reached!: () => void;
    const reachedClose = new Promise<void>(resolve => { reached = resolve; });
    const closing = new Promise<void>(resolve => { release = resolve; });
    f.state.hook = async phase => { if (phase === 'close') { reached(); await closing; } };
    const operation = f.execute(); await reachedClose;
    assert.equal(f.state.manifests.length, 0); release(); await operation;
    assert.equal(f.state.manifests.length, 1);
  });
  it.each([names.workspaceLocalDataCapture, names.workspaceSourceImportView])('requires explicit %s', async absent => {
    const f = await fixture(); const snapshot = f.state.grants!;
    f.state.grants = { ...snapshot, tenantAccess: [{ tenantId: 'tenant', allowedActions: [], projectAccess: [{
      projectId: 'project', allowedActions: [], environmentAccess: [{ environmentId: 'test',
        allowedActions: [names.workspaceLocalDataCapture, names.workspaceSourceImportView].filter(action => action !== absent) }],
    }] }] };
    await assert.rejects(f.execute(), /ACCESS_DENIED/u); assert.deepEqual(f.state.events, []);
  });
  it('revalidates real application policy after source closure', async () => {
    const f = await fixture();
    f.state.hook = phase => { if (phase === 'close') f.state.grants = null; };
    await assert.rejects(f.execute()); assert.equal(f.state.events.includes('promote'), false);
  });
  it.each(['read', 'append', 'close', 'promote'])('honors caller abort at %s without a committed result', async phase => {
    const f = await fixture(); const controller = new AbortController();
    f.state.hook = current => { if (current === phase) controller.abort(); };
    await assert.rejects(f.execute(f.command, controller.signal)); assert.equal(f.state.manifests.length, 0);
  });
  it('does no I/O for a pre-aborted request', async () => {
    const f = await fixture(); const controller = new AbortController(); controller.abort();
    await assert.rejects(f.execute(f.command, controller.signal), /CANCELLED/u); assert.deepEqual(f.state.events, []);
  });
  it.each(['database', 'credentialRef', 'id'] as const)('rejects a changed %s binding before promotion', async key => {
    const f = await fixture();
    f.state.hook = phase => { if (phase === 'close') f.state.connection = { ...f.state.connection, [key]: 'changed' }; };
    await assert.rejects(f.execute(), /SOURCE_BINDING_CHANGED|SOURCE_REJECTED/u);
    assert.equal(f.state.events.includes('promote'), false);
  });
  it('does not invalidate raw capture for a friendly connection rename', async () => {
    const f = await fixture();
    f.state.hook = phase => { if (phase === 'close') f.state.connection = { ...f.state.connection, name: 'Renamed' }; };
    await f.execute(); assert.equal(f.state.manifests.length, 1);
  });
  it('rejects a missing credential without invoking reader or writer', async () => {
    const f = await fixture(); const { credentialRef: _credential, ...connection } = f.state.connection;
    f.state.connection = connection;
    await assert.rejects(f.execute(), /SOURCE_REJECTED/u); assert.equal(f.state.events.includes('open'), false);
  });
  it.each(['sql', 'credentialRef', 'scope', 'maxRows'])('rejects client-owned %s in the command', async key => {
    const f = await fixture(); await assert.rejects(f.execute({ ...f.command, [key]: 'forbidden' }), /INVALID_INPUT/u);
    assert.deepEqual(f.state.events, []);
  });
  it('rejects a sample target above the server row budget before any I/O', async () => {
    const f = await fixture();
    await assert.rejects(f.execute({ ...f.command, policy: { kind: 'sample', method: 'first', requestedRows: '101' } }), /CAPTURE_BUDGET/u);
    assert.deepEqual(f.state.events, []);
  });
  it.each([
    { rows: [], logicalBytes: 0, endOfSource: false },
    { rows: [], logicalBytes: 1, endOfSource: true },
    { logicalBytes: -1 }, { logicalBytes: Number.NaN }, { logicalBytes: 1.2 }, { logicalBytes: 1001 },
    { rows: [[1n], [2n], [3n]] }, { endOfSource: undefined },
  ])('rejects malformed/budget-breaking evidence case %#', async badBatch => {
    const f = await fixture(); f.state.badBatch = badBatch;
    await assert.rejects(f.execute(), /INVALID_BATCH|CAPTURE_BUDGET/u);
    assert.equal(f.state.events.includes('append'), false); assert.equal(f.state.events.includes('promote'), false);
  });
  it('snapshots command and scope before the first await', async () => {
    const f = await fixture(); const id = f.command.localDatasetId;
    f.state.hook = phase => { if (phase === 'catalog') {
      f.command.sourceRef.connectionRef.connectionId = 'mutated'; f.context.scope.tenantId = 'mutated';
    } };
    const result = await f.execute(); assert.equal(result.generation.localDatasetId, id);
    assert.equal(result.generation.request.sourceRef.connectionRef.connectionId, 'pg');
  });
  it('propagates promotion/confirmation failure without retry or a false rollback claim', async () => {
    const f = await fixture();
    f.state.hook = phase => { if (phase === 'committed') throw new Error('confirmation lost after commit'); };
    await assert.rejects(f.execute(), /confirmation lost/u);
    assert.equal(f.state.events.filter(phase => phase === 'promote').length, 1);
    assert.equal(f.state.manifests.length, 1, 'commit can exist even when receipt delivery fails');
  });
  it('expires authorization before promotion and preserves the exact caller CAS predecessor', async () => {
    const f = await fixture(); const predecessor = createLocalDataGenerationIdV1();
    f.state.hook = phase => { if (phase === 'close') f.setNow(new Date('2026-10-17T00:01:00.000Z')); };
    await assert.rejects(f.execute({ ...f.command, expectedHeadGenerationId: predecessor }));
    assert.equal(f.state.begin?.expectedHeadGenerationId, predecessor);
    assert.equal(f.state.events.includes('promote'), false);
  });
  it('keeps the coordinator free of native/provider imports and display DTOs', async () => {
    const text = readFileSync(new URL('../../../src/application/services/captureLocalDatasetUseCase.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(text, /from\s+['"][^'"]*(?:infrastructure|@duckdb|pg-cursor|\/postgres\/)/u);
    assert.doesNotMatch(text, /SourceDataSample|DuckDbGenerationStore|PostgresRemoteDatasetReader/u);
    assert.match(text, /localDataAcquisition/u);
  });
});


/** Expose borrowed adapter arrays deliberately; the coordinator must own its evidence. */
async function borrowedBatchFixture() {
  const f = await fixture();
  let borrowed: { rows: unknown[][]; logicalBytes: number; endOfSource: boolean } | undefined;
  const appended: unknown[][] = [];
  const reader: IRemoteDatasetReader = {
    async withCursor(input, consume) {
      return f.deps.reader.withCursor(input, cursor => consume({
        schema: cursor.schema,
        observedAt: cursor.observedAt,
        async read(requested) {
          const batch = await cursor.read(requested);
          borrowed = { rows: batch.rows.map(row => [...row]), logicalBytes: batch.logicalBytes,
            endOfSource: batch.endOfSource };
          return borrowed;
        },
      }));
    },
  };
  const useCase = new f.CaptureLocalDatasetUseCase({ ...f.deps, reader,
    createWriter: (actual, access) => {
      const writer = f.deps.createWriter(actual, access);
      return { ...writer, async append(id, rows) {
        await writer.append(id, rows);
        appended.push(...rows.map(row => [...row]));
      } };
    },
  });
  return { f, appended, borrowed: () => borrowed,
    execute: () => useCase.execute(f.command, f.context) };
}

describe('captured batch evidence is owned before asynchronous checkpoints', () => {
  for (const phase of ['catalog', 'append'] as const) {
    it.each(['eof', 'bytes', 'outerRows', 'cell'] as const)(`pins %s against mutation during ${phase}`, async kind => {
      const b = await borrowedBatchFixture(); let mutated = false;
      b.f.state.hook = current => {
        const batch = b.borrowed();
        if (current !== phase || !batch || mutated) return;
        mutated = true;
        if (kind === 'eof') batch.endOfSource = true;
        if (kind === 'bytes') batch.logicalBytes = 9999;
        if (kind === 'outerRows') batch.rows.push([999n]);
        if (kind === 'cell') batch.rows[0]![0] = 999n;
      };
      const result = await b.execute();
      assert.equal(mutated, true);
      assert.equal(result.generation.rowCount, '5');
      assert.equal(result.generation.logicalByteCount, '40');
      assert.equal(result.generation.completionReason, 'source-exhausted');
      assert.deepEqual(b.appended, [[1n], [2n], [3n], [4n], [5n]]);
      assert.deepEqual(b.f.state.pulls, [2, 2, 2]);
    });
  }
  it('rejects invalid initial evidence before a checkpoint can repair it', async () => {
    const b = await borrowedBatchFixture();
    b.f.state.badBatch = { rows: [], logicalBytes: 0, endOfSource: false };
    b.f.state.hook = phase => {
      const batch = b.borrowed();
      if (phase === 'catalog' && batch) batch.endOfSource = true;
    };
    await assert.rejects(b.execute(), /INVALID_BATCH/u);
    assert.equal(b.f.state.events.includes('append'), false);
    assert.equal(b.f.state.events.includes('promote'), false);
  });
});
